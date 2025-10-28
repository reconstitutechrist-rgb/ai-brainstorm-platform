console.log('[DEBUG] Loading intelligenceHub.ts route file...');
import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
console.log('[DEBUG] About to import IntelligenceSearchAgent...');
import { IntelligenceSearchAgent } from '../agents/intelligenceSearchAgent';
console.log('[DEBUG] IntelligenceSearchAgent imported successfully');

const router = Router();
console.log('[DEBUG] Creating IntelligenceSearchAgent instance...');
const searchAgent = new IntelligenceSearchAgent(supabase);
console.log('[DEBUG] IntelligenceSearchAgent instance created successfully');

// Test route to verify routes are registered
router.get('/test', (req: Request, res: Response) => {
  console.log('[DEBUG] Test route hit!');
  res.json({ success: true, message: 'Intelligence Hub routes are working!' });
});

/**
 * Search across all project intelligence data
 * POST /api/intelligence-hub/:projectId/search
 */
router.post('/:projectId/search', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { query, searchMode = 'general', filters } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    console.log(`[IntelligenceHub] Search request for project ${projectId}: "${query}"`);

    const results = await searchAgent.search(
      projectId,
      query,
      searchMode,
      filters
    );

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('[IntelligenceHub] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search project intelligence',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Save search results as a document
 * POST /api/intelligence-hub/:projectId/save-as-document
 */
router.post('/:projectId/save-as-document', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      content,
      documentType,
      isUserDocument = false,
      folderId
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    console.log(`[IntelligenceHub] Saving search results as document for project ${projectId}`);

    if (isUserDocument) {
      // Save as user document
      const { data, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          filename: `${title}.md`,
          type: 'document',
          metadata: {
            type: 'document',
            description: 'Document created from search results',
            mimeType: 'text/markdown',
            source: 'intelligence_search'
          },
          folder_id: folderId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Store content in a separate file/storage
      // For now, we'll store it in metadata
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          metadata: {
            ...data.metadata,
            content: content,
            createdFromSearch: true
          }
        })
        .eq('id', data.id);

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        document: data,
        message: 'Document created successfully'
      });
    } else {
      // Save as generated document
      const { data, error } = await supabase
        .from('generated_documents')
        .insert({
          project_id: projectId,
          document_type: documentType || 'project_brief',
          title: title,
          content: content,
          status: 'ready',
          completion_percent: 100,
          quality_scores: {
            completeness: 100,
            consistency: 100,
            citation_coverage: 100,
            readability: 100,
            confidence: 100
          },
          metadata: {
            source: 'intelligence_search',
            createdFromSearch: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        document: data,
        message: 'Generated document created successfully'
      });
    }
  } catch (error) {
    console.error('[IntelligenceHub] Save document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save document',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
