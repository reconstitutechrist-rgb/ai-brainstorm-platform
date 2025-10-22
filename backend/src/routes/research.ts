import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { LiveResearchAgent } from '../agents/liveResearchAgent';
import { DocumentResearchAgent, ConversationMessage } from '../agents/documentResearchAgent';
import { ResearchSuggestionAgent } from '../agents/researchSuggestionAgent';
import { UnifiedResearchAgent, ResearchSource, ResearchIntent } from '../agents/unifiedResearchAgent';

const router = Router();
const liveResearchAgent = new LiveResearchAgent();
const documentResearchAgent = new DocumentResearchAgent();
const researchSuggestionAgent = new ResearchSuggestionAgent();
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

    // Perform the research with progress callbacks
    const result = await liveResearchAgent.research(
      query,
      projectId,
      userId,
      {
        maxSources,
        includeAnalysis: true,
        saveToDB: saveResults,
      },
      {
        onSearchComplete: async (count: number) => {
          await updateProgress('crawling', { message: `Found ${count} sources, extracting content...`, sourcesFound: count });
        },
        onCrawlComplete: async (count: number) => {
          await updateProgress('analyzing', { message: `Analyzing ${count} documents...`, documentsReady: count });
        },
        onAnalysisComplete: async (count: number) => {
          await updateProgress('synthesizing', { message: 'Generating comprehensive summary...', analysesComplete: count });
        },
      }
    );

    console.log(`[Research] Research completed for query ${queryId}`);
    console.log(`[Research] Found ${result.sources.length} sources, saved ${result.savedReferences.length} references`);

    // Generate follow-up questions
    const followUpQuestions = await generateFollowUpQuestions(query, result.synthesis);

    // Update query with results
    await supabase
      .from('research_queries')
      .update({
        status: 'completed',
        results_count: result.sources.length,
        metadata: {
          synthesis: result.synthesis,
          sources: result.sources,
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
    const agent = new LiveResearchAgent();
    const prompt = `Based on this research query: "${query}"

And this synthesis of findings:
${synthesis.substring(0, 1000)}

Generate 3-5 specific follow-up research questions that would deepen understanding of this topic. Return ONLY a JSON array of strings, no other text.

Example format: ["Question 1?", "Question 2?", "Question 3?"]`;

    const response = await agent['callClaude']([{ role: 'user', content: prompt }], 500);

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
 * DOCUMENT RESEARCH ENDPOINTS (Phase 3.1)
 * ============================================
 */

/**
 * Start a conversational document research session
 */
router.post('/document-research/start', async (req: Request, res: Response) => {
  try {
    const { projectId, userId, initialMessage } = req.body;

    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'projectId and userId are required',
      });
    }

    console.log(`[DocumentResearch] Starting session for project ${projectId}`);

    // Create a new research query record with session type
    const { data: session, error: sessionError } = await supabase
      .from('research_queries')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          query: initialMessage || 'What documents do I need for my project?',
          status: 'conversational',
          session_type: 'conversational',
          conversation_thread: {
            messages: [],
            started_at: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (sessionError) {
      console.error('[DocumentResearch] Error creating session:', sessionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create document research session',
      });
    }

    // If initial message provided, process it
    let response = null;
    if (initialMessage) {
      // Fetch project context
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('[DocumentResearch] Error fetching project:', projectError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch project',
        });
      }

      // Fetch project items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('project_id', projectId);

      if (itemsError) {
        console.error('[DocumentResearch] Error fetching items:', itemsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch project items',
        });
      }

      // Build project context
      const projectContext = {
        id: project.id,
        title: project.title,
        description: project.description || '',
        items: items || [],
        created_at: project.created_at,
        updated_at: project.updated_at,
      };

      // Process initial message
      const chatResult = await documentResearchAgent.chat(
        initialMessage,
        projectContext,
        []
      );

      response = chatResult;

      // Update session with conversation
      await supabase
        .from('research_queries')
        .update({
          conversation_thread: {
            messages: chatResult.updatedHistory,
            started_at: new Date().toISOString(),
          },
          metadata: {
            discovery: chatResult.discovery,
          },
        })
        .eq('id', session.id);
    }

    console.log(`[DocumentResearch] Session ${session.id} created`);

    res.json({
      success: true,
      sessionId: session.id,
      response: response?.response,
      discovery: response?.discovery,
    });
  } catch (error: any) {
    console.error('[DocumentResearch] Error starting session:', error);
    res.status(500).json({
      success: false,
      error: `Failed to start document research session: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Send a message in a conversational document research session
 */
router.post('/document-research/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message, projectId } = req.body;

    if (!sessionId || !message || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, message, and projectId are required',
      });
    }

    console.log(`[DocumentResearch] Processing message in session ${sessionId}`);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('research_queries')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Fetch project context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[DocumentResearch] Error fetching project:', projectError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project',
      });
    }

    // Fetch project items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId);

    if (itemsError) {
      console.error('[DocumentResearch] Error fetching items:', itemsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project items',
      });
    }

    // Build project context
    const projectContext = {
      id: project.id,
      title: project.title,
      description: project.description || '',
      items: items || [],
      created_at: project.created_at,
      updated_at: project.updated_at,
    };

    // Get conversation history
    const conversationHistory = session.conversation_thread?.messages || [];

    // Process message
    const chatResult = await documentResearchAgent.chat(
      message,
      projectContext,
      conversationHistory
    );

    // Update session with new conversation
    await supabase
      .from('research_queries')
      .update({
        conversation_thread: {
          messages: chatResult.updatedHistory,
          started_at: session.conversation_thread?.started_at || new Date().toISOString(),
        },
        metadata: {
          ...session.metadata,
          discovery: chatResult.discovery,
          last_updated: new Date().toISOString(),
        },
      })
      .eq('id', sessionId);

    console.log(`[DocumentResearch] Message processed in session ${sessionId}`);

    res.json({
      success: true,
      response: chatResult.response,
      discovery: chatResult.discovery,
    });
  } catch (error: any) {
    console.error('[DocumentResearch] Error processing chat:', error);
    res.status(500).json({
      success: false,
      error: `Failed to process message: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Generate a document from document research session
 */
router.post('/document-research/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId, templateId, projectId, userId } = req.body;

    if (!sessionId || !templateId || !projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, templateId, projectId, and userId are required',
      });
    }

    console.log(`[DocumentResearch] Generating document ${templateId} from session ${sessionId}`);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('research_queries')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Fetch project context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project',
      });
    }

    // Fetch project items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId);

    if (itemsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project items',
      });
    }

    // Build project context
    const projectContext = {
      id: project.id,
      title: project.title,
      description: project.description || '',
      items: items || [],
      created_at: project.created_at,
      updated_at: project.updated_at,
    };

    // Get conversation summary
    const conversationSummary = session.metadata?.discovery?.conversationSummary || 'Document generated via Document Research Agent';

    // Generate document
    const result = await documentResearchAgent.generateDocument(
      templateId,
      projectContext,
      userId,
      conversationSummary
    );

    // Save to generated_documents table
    const { data: savedDoc, error: saveError } = await supabase
      .from('generated_documents')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          document_type: result.templateId,
          content: result.autoFillResult.content,
          folder_category: result.autoFillResult.category,
          completion_percent: result.autoFillResult.completionPercent,
          missing_fields: result.autoFillResult.missingFields,
          metadata: {
            ...result.metadata,
            session_id: sessionId,
            filled_fields: result.autoFillResult.filledFields,
          },
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('[DocumentResearch] Error saving document:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save generated document',
      });
    }

    console.log(`[DocumentResearch] Document ${savedDoc.id} generated successfully`);

    res.json({
      success: true,
      document: savedDoc,
      autoFillResult: result.autoFillResult,
      message: `Document "${result.templateName}" generated successfully (${result.autoFillResult.completionPercent}% complete)`,
    });
  } catch (error: any) {
    console.error('[DocumentResearch] Error generating document:', error);
    res.status(500).json({
      success: false,
      error: `Failed to generate document: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Get document research session history
 */
router.get('/document-research/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('research_queries')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        projectId: session.project_id,
        userId: session.user_id,
        query: session.query,
        status: session.status,
        sessionType: session.session_type,
        conversationThread: session.conversation_thread,
        discovery: session.metadata?.discovery,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[DocumentResearch] Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch session: ${error.message || error.toString()}`,
    });
  }
});

/**
 * Get all document research sessions for a project
 */
router.get('/document-research/project/:projectId/sessions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data: sessions, error } = await supabase
      .from('research_queries')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_type', 'conversational')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      sessions: sessions?.map(s => ({
        id: s.id,
        projectId: s.project_id,
        userId: s.user_id,
        query: s.query,
        status: s.status,
        sessionType: s.session_type,
        messageCount: s.conversation_thread?.messages?.length || 0,
        lastUpdated: s.metadata?.last_updated || s.updated_at,
        createdAt: s.created_at,
      })) || [],
    });
  } catch (error: any) {
    console.error('[DocumentResearch] Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch sessions: ${error.message || error.toString()}`,
    });
  }
});

/**
 * ============================================
 * RESEARCH SUGGESTIONS ENDPOINTS (Phase 3.2)
 * ============================================
 */

/**
 * Get smart research suggestions for a project
 * Analyzes project gaps and suggests research areas
 */
router.get('/suggestions/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`[ResearchSuggestions] Analyzing gaps for project ${projectId}`);

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    // Fetch project items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId);

    if (itemsError) {
      console.error('[ResearchSuggestions] Error fetching items:', itemsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project items',
      });
    }

    // Fetch research queries for this project
    const { data: researchQueries, error: queriesError } = await supabase
      .from('research_queries')
      .select('*')
      .eq('project_id', projectId);

    if (queriesError) {
      console.error('[ResearchSuggestions] Error fetching research queries:', queriesError);
    }

    // Fetch references for this project
    const { data: references, error: referencesError } = await supabase
      .from('references')
      .select('*')
      .eq('project_id', projectId);

    if (referencesError) {
      console.error('[ResearchSuggestions] Error fetching references:', referencesError);
    }

    // Build project context
    const projectContext = {
      title: project.title,
      description: project.description || '',
      items: items || [],
      decidedItems: (items || []).filter((i: any) => i.state === 'decided'),
      exploringItems: (items || []).filter((i: any) => i.state === 'exploring'),
      parkedItems: (items || []).filter((i: any) => i.state === 'parked'),
      researchDocuments: researchQueries || [],
      references: references || [],
    };

    // Analyze gaps
    const result = await researchSuggestionAgent.analyzeProjectGaps(projectContext);

    console.log(`[ResearchSuggestions] Found ${result.totalGaps} gaps for project ${projectId}`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[ResearchSuggestions] Error analyzing gaps:', error);
    res.json({
      success: false,
      error: `Failed to analyze research gaps: ${error.message || error.toString()}`,
    });
  }
});

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
