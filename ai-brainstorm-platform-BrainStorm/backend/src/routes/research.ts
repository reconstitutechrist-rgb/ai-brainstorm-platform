import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { UnifiedResearchAgent, ResearchSource, ResearchIntent } from '../agents/unifiedResearchAgent';

const router = Router();
const unifiedResearchAgent = new UnifiedResearchAgent();

/**
 * Start a new research query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, projectId, userId, maxSources = 5, saveResults = true } = req.body;

    if (!query || !projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'query, projectId, and userId are required',
      });
    }

    console.log(`[Research] Starting research for: "${query}" (project: ${projectId})`);

    // Save research query to database
    const { data: researchQuery, error: queryError } = await supabase
      .from('research_queries')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          query,
          status: 'processing',
          max_sources: maxSources,
        },
      ])
      .select()
      .single();

    if (queryError) {
      console.error('[Research] Error saving query:', queryError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save research query',
      });
    }

    // Perform research in background (async)
    performResearchAsync(
      query,
      projectId,
      userId,
      researchQuery.id,
      maxSources,
      saveResults
    );

    console.log(`[Research] Research query ${researchQuery.id} started`);

    res.json({
      success: true,
      queryId: researchQuery.id,
      message: 'Research started. Check status for updates.',
    });
  } catch (error: any) {
    console.error('[Research] Error starting research:', error);
    res.status(500).json({
      success: false,
      error: `Failed to start research: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Get research query status and results
 */
router.get('/query/:queryId', async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;

    const { data: query, error } = await supabase
      .from('research_queries')
      .select('*')
      .eq('id', queryId)
      .single();

    if (error) throw error;

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Research query not found',
      });
    }

    // If completed, also fetch researched documents
    let documents = [];
    if (query.status === 'completed' && query.metadata?.savedReferences) {
      // Use the saved reference IDs from metadata for accurate fetching
      const { data: refs, error: refsError } = await supabase
        .from('references')
        .select('*')
        .in('id', query.metadata.savedReferences);

      if (!refsError && refs) {
        documents = refs;
      }
    }

    res.json({
      success: true,
      query,
      documents,
    });
  } catch (error: any) {
    console.error('[Research] Error fetching query:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch research query: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Get all research queries for a project
 */
router.get('/project/:projectId/queries', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data: queries, error } = await supabase
      .from('research_queries')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      queries: queries || [],
    });
  } catch (error: any) {
    console.error('[Research] Error fetching queries:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch research queries: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Delete a research query and its associated documents
 */
router.delete('/query/:queryId', async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;

    // Delete the query
    const { error } = await supabase
      .from('research_queries')
      .delete()
      .eq('id', queryId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Research query deleted',
    });
  } catch (error: any) {
    console.error('[Research] Error deleting query:', error);
    res.status(500).json({
      success: false,
      error: `Failed to delete research query: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Perform research asynchronously
 */
async function performResearchAsync(
  query: string,
  projectId: string,
  userId: string,
  queryId: string,
  maxSources: number,
  saveResults: boolean
) {
  // Helper to update progress
  const updateProgress = async (stage: string, details?: any) => {
    await supabase
      .from('research_queries')
      .update({
        status: 'processing',
        metadata: {
          progress: {
            stage,
            timestamp: new Date().toISOString(),
            ...details,
          },
        },
      })
      .eq('id', queryId);
  };

  try {
    console.log(`[Research] Performing async research for query ${queryId}`);

    // Stage 1: Searching
    await updateProgress('searching', { message: 'Finding relevant sources...' });

    // Perform the research with unified agent (web-only mode)
    const result = await unifiedResearchAgent.research(
      query,
      projectId,
      userId,
      {
        sources: 'web',
        intent: 'research',
        maxWebSources: maxSources,
        maxDocumentSources: 0,
        includeAnalysis: true,
        saveToDB: saveResults,
      },
      {
        onWebSearchComplete: async (count: number) => {
          await updateProgress('crawling', { message: `Found ${count} sources, extracting content...`, sourcesFound: count });
        },
        onAnalysisComplete: async (count: number) => {
          await updateProgress('analyzing', { message: `Analyzing ${count} documents...`, documentsReady: count });
        },
        onSynthesisComplete: async () => {
          await updateProgress('synthesizing', { message: 'Generating comprehensive summary...' });
        },
      }
    );

    console.log(`[Research] Research completed for query ${queryId}`);
    console.log(`[Research] Found ${result.webSources.length} web sources, saved ${result.savedReferences.length} references`);

    // Generate follow-up questions
    const followUpQuestions = await generateFollowUpQuestions(query, result.synthesis);

    // Update query with results
    await supabase
      .from('research_queries')
      .update({
        status: 'completed',
        results_count: result.webSources.length,
        metadata: {
          synthesis: result.synthesis,
          sources: result.webSources,
          savedReferences: result.savedReferences,
          duration: result.metadata.duration,
          followUpQuestions,
          progress: {
            stage: 'completed',
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', queryId);

    console.log(`[Research] Updated query ${queryId} status to completed`);
  } catch (error: any) {
    console.error(`[Research] Error performing research for query ${queryId}:`, error);

    // Update query with error
    await supabase
      .from('research_queries')
      .update({
        status: 'failed',
        metadata: {
          error: error.message || error.toString(),
          progress: {
            stage: 'failed',
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', queryId);
  }
}

/**
 * Generate follow-up research questions based on the query and synthesis
 */
async function generateFollowUpQuestions(query: string, synthesis: string): Promise<string[]> {
  try {
    const prompt = `Based on this research query: "${query}"

And this synthesis of findings:
${synthesis.substring(0, 1000)}

Generate 3-5 specific follow-up research questions that would deepen understanding of this topic. Return ONLY a JSON array of strings, no other text.

Example format: ["Question 1?", "Question 2?", "Question 3?"]`;

    const response = await unifiedResearchAgent['callClaude']([{ role: 'user', content: prompt }], 500);

    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      return Array.isArray(questions) ? questions.slice(0, 5) : [];
    }

    return [];
  } catch (error) {
    console.error('[Research] Error generating follow-up questions:', error);
    return [];
  }
}

/**
 * ============================================
 * UNIFIED RESEARCH ENDPOINTS (Phase 3.3)
 * ============================================
 */

/**
 * Start a unified research query
 * Combines web + document search in a single intelligent system
 */
router.post('/unified', async (req: Request, res: Response) => {
  try {
    const {
      query,
      projectId,
      userId,
      sources = 'auto',
      intent = 'research',
      maxWebSources = 5,
      maxDocumentSources = 10,
      saveResults = true,
    } = req.body;

    if (!query || !projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'query, projectId, and userId are required',
      });
    }

    console.log(`[UnifiedResearch] Starting unified research for: "${query}" (project: ${projectId})`);
    console.log(`[UnifiedResearch] Options: sources=${sources}, intent=${intent}`);

    // Save research query to database with unified type
    const { data: researchQuery, error: queryError } = await supabase
      .from('research_queries')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          query,
          status: 'processing',
          max_sources: maxWebSources,
          session_type: 'unified',
          metadata: {
            researchType: 'unified',
            sources,
            intent,
            maxWebSources,
            maxDocumentSources,
          },
        },
      ])
      .select()
      .single();

    if (queryError) {
      console.error('[UnifiedResearch] Error saving query:', queryError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save research query',
      });
    }

    // Perform unified research in background
    performUnifiedResearchAsync(
      query,
      projectId,
      userId,
      researchQuery.id,
      sources as ResearchSource,
      intent as ResearchIntent,
      maxWebSources,
      maxDocumentSources,
      saveResults
    );

    console.log(`[UnifiedResearch] Unified research query ${researchQuery.id} started`);

    res.json({
      success: true,
      queryId: researchQuery.id,
      message: 'Unified research started. Check status for updates.',
    });
  } catch (error: any) {
    console.error('[UnifiedResearch] Error starting unified research:', error);
    res.status(500).json({
      success: false,
      error: `Failed to start unified research: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Perform unified research asynchronously
 */
async function performUnifiedResearchAsync(
  query: string,
  projectId: string,
  userId: string,
  queryId: string,
  sources: ResearchSource,
  intent: ResearchIntent,
  maxWebSources: number,
  maxDocumentSources: number,
  saveResults: boolean
) {
  // Helper to update progress
  const updateProgress = async (stage: string, details?: any) => {
    await supabase
      .from('research_queries')
      .update({
        status: 'processing',
        metadata: {
          researchType: 'unified',
          sources,
          intent,
          maxWebSources,
          maxDocumentSources,
          progress: {
            stage,
            timestamp: new Date().toISOString(),
            ...details,
          },
        },
      })
      .eq('id', queryId);
  };

  try {
    console.log(`[UnifiedResearch] Performing async research for query ${queryId}`);

    // Stage 1: Source selection
    await updateProgress('source_selection', { message: 'Determining optimal search strategy...' });

    // Perform unified research with progress callbacks
    const result = await unifiedResearchAgent.research(
      query,
      projectId,
      userId,
      {
        sources,
        intent,
        maxWebSources,
        maxDocumentSources,
        includeAnalysis: true,
        saveToDB: saveResults,
      },
      {
        onSourceSelectionComplete: async (strategy: string) => {
          await updateProgress('source_selection_complete', {
            message: `Strategy: ${strategy}`,
            strategy,
          });
        },
        onWebSearchComplete: async (count: number) => {
          await updateProgress('web_search_complete', {
            message: `Found ${count} web sources`,
            webSourcesCount: count,
          });
        },
        onDocumentSearchComplete: async (count: number) => {
          await updateProgress('document_search_complete', {
            message: `Found ${count} project documents`,
            documentSourcesCount: count,
          });
        },
        onAnalysisComplete: async (count: number) => {
          await updateProgress('analysis_complete', {
            message: `Analyzed ${count} sources`,
            analysisCount: count,
          });
        },
        onSynthesisComplete: async () => {
          await updateProgress('synthesis_complete', {
            message: 'Generating unified synthesis...',
          });
        },
      }
    );

    console.log(`[UnifiedResearch] Research completed for query ${queryId}`);
    console.log(`[UnifiedResearch] Found ${result.webSources.length} web + ${result.documentSources.length} doc sources`);

    // Update query with results
    await supabase
      .from('research_queries')
      .update({
        status: 'completed',
        results_count: result.metadata.totalSources,
        metadata: {
          researchType: 'unified',
          sources,
          intent,
          synthesis: result.synthesis,
          webSources: result.webSources,
          documentSources: result.documentSources.map(d => ({
            id: d.id,
            filename: d.filename,
            type: d.type,
            relevanceScore: d.relevanceScore,
          })),
          suggestedDocuments: result.suggestedDocuments,
          identifiedGaps: result.identifiedGaps,
          savedReferences: result.savedReferences,
          searchStrategy: result.metadata.searchStrategy,
          duration: result.metadata.duration,
          // Add missing metadata fields for consistency
          totalSources: result.metadata.totalSources,
          webSourcesCount: result.metadata.webSourcesCount,
          documentSourcesCount: result.metadata.documentSourcesCount,
          progress: {
            stage: 'completed',
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', queryId);

    console.log(`[UnifiedResearch] Updated query ${queryId} status to completed`);
  } catch (error: any) {
    console.error(`[UnifiedResearch] Error performing research for query ${queryId}:`, error);

    // Update query with error
    await supabase
      .from('research_queries')
      .update({
        status: 'failed',
        metadata: {
          researchType: 'unified',
          error: error.message || error.toString(),
          progress: {
            stage: 'failed',
            timestamp: new Date().toISOString(),
          },
        },
      })
      .eq('id', queryId);
  }
}

export default router;
