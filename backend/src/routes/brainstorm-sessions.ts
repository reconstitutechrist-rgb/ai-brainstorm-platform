import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { SessionCompletionService } from '../services/sessionCompletionService';

const router = Router();

/**
 * GET /api/brainstorm-sessions/project/:projectId
 * Get all brainstorm sessions for a project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const completionService = new SessionCompletionService(supabase);
    const sessions = await completionService.getProjectSessions(projectId);

    res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Get project sessions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch brainstorm sessions',
    });
  }
});

/**
 * GET /api/brainstorm-sessions/:sessionId
 * Get detailed information about a specific session
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const completionService = new SessionCompletionService(supabase);
    const session = await completionService.getSessionSummary(sessionId);

    res.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session',
    });
  }
});

/**
 * GET /api/brainstorm-sessions/:sessionId/documents
 * Get all documents created/updated by a specific session
 */
router.get('/:sessionId/documents', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const generatedDocIds = session.generated_document_ids || [];
    const updatedDocIds = session.updated_document_ids || [];

    // Fetch documents
    const { data: generatedDocs, error: genError } = await supabase
      .from('generated_documents')
      .select('*')
      .in('id', generatedDocIds);

    const { data: updatedDocs, error: updError } = await supabase
      .from('generated_documents')
      .select('*')
      .in('id', updatedDocIds);

    if (genError || updError) {
      throw genError || updError;
    }

    res.json({
      success: true,
      documents: {
        generated: generatedDocs || [],
        updated: updatedDocs || [],
      },
    });
  } catch (error: any) {
    console.error('Get session documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session documents',
    });
  }
});

/**
 * DELETE /api/brainstorm-sessions/:sessionId
 * Delete a brainstorm session (soft delete - archives it)
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Instead of hard delete, update metadata to mark as archived
    const { error } = await supabase
      .from('brainstorm_sessions')
      .update({
        metadata: {
          archived: true,
          archivedAt: new Date().toISOString(),
        },
      })
      .eq('id', sessionId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Session archived successfully',
    });
  } catch (error: any) {
    console.error('Archive session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to archive session',
    });
  }
});

/**
 * GET /api/brainstorm-sessions/stats/:projectId
 * Get statistics about brainstorm sessions for a project
 */
router.get('/stats/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data: sessions, error } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw error;
    }

    const stats = {
      totalSessions: sessions?.length || 0,
      totalAcceptedIdeas: sessions?.reduce(
        (sum, s) => sum + (s.accepted_ideas?.length || 0),
        0
      ) || 0,
      totalRejectedIdeas: sessions?.reduce(
        (sum, s) => sum + (s.rejected_ideas?.length || 0),
        0
      ) || 0,
      totalUnmarkedIdeas: sessions?.reduce(
        (sum, s) => sum + (s.unmarked_ideas?.length || 0),
        0
      ) || 0,
      mostRecentSession: sessions?.[0] || null,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch session stats',
    });
  }
});

export default router;
