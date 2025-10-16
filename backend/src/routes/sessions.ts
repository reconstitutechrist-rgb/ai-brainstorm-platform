import express, { Request, Response } from 'express';
import { sessionService } from '../services/sessionService';

const router = express.Router();

/**
 * POST /api/sessions/start
 * Start a new session
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'userId and projectId are required'
      });
    }

    const session = await sessionService.startSession(userId, projectId);

    if (!session) {
      return res.status(500).json({
        success: false,
        error: 'Failed to start session'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session'
    });
  }
});

/**
 * POST /api/sessions/end
 * End the current active session
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'userId and projectId are required'
      });
    }

    await sessionService.endActiveSession(userId, projectId);

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

/**
 * GET /api/sessions/summary/:userId/:projectId
 * Get session summary for a user and project
 */
router.get('/summary/:userId/:projectId', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.params;

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'userId and projectId are required'
      });
    }

    const summary = await sessionService.getSessionSummary(userId, projectId);

    if (!summary) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get session summary'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting session summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session summary'
    });
  }
});

/**
 * GET /api/sessions/analytics/:userId/:projectId
 * Get analytics for a user and project
 */
router.get('/analytics/:userId/:projectId', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.params;

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'userId and projectId are required'
      });
    }

    const analytics = await sessionService.getOrCreateAnalytics(userId, projectId);

    if (!analytics) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get analytics'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

/**
 * POST /api/sessions/track-activity
 * Track user activity
 */
router.post('/track-activity', async (req: Request, res: Response) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'userId and projectId are required'
      });
    }

    // Fire and forget - don't wait for completion
    sessionService.trackActivity(userId, projectId).catch(error => {
      console.error('Error in background activity tracking:', error);
    });

    res.json({
      success: true,
      message: 'Activity tracked'
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track activity'
    });
  }
});

/**
 * GET /api/sessions/suggested-steps/:projectId
 * Get suggested next steps for a project
 */
router.get('/suggested-steps/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const steps = await sessionService.generateSuggestedSteps(projectId);

    res.json({
      success: true,
      data: steps
    });
  } catch (error) {
    console.error('Error getting suggested steps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggested steps'
    });
  }
});

/**
 * GET /api/sessions/blockers/:projectId
 * Get active blockers for a project
 */
router.get('/blockers/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'projectId is required'
      });
    }

    const blockers = await sessionService.detectBlockers(projectId);

    res.json({
      success: true,
      data: blockers
    });
  } catch (error) {
    console.error('Error getting blockers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockers'
    });
  }
});

export default router;
