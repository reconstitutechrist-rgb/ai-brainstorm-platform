/**
 * Simple Chat API Route
 *
 * A simplified alternative to the complex conversation endpoint.
 * Uses the 3-mode system instead of 9-agent orchestration.
 *
 * Endpoint: POST /api/simple-chat/:projectId/message
 */

import { Router, Request, Response } from 'express';
import { handleMessage, detectMode } from '../modes';

const router = Router();

/**
 * POST /api/simple-chat/:projectId/message
 *
 * Send a message using the simplified mode system.
 * Automatically detects intent and routes to appropriate mode.
 */
router.post('/:projectId/message', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { message, userId } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required',
      });
    }

    console.log(`[SimpleChat] Received message for project ${projectId}`);

    // Process message through simplified mode system
    const response = await handleMessage(message, projectId, userId);

    res.json({
      success: true,
      data: {
        message: response.message,
        mode: response.mode,
        extractedItems: response.extractedItems,
        metadata: response.metadata,
      },
    });
  } catch (error: any) {
    console.error('[SimpleChat] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/simple-chat/detect-mode
 *
 * Preview which mode a message would trigger.
 * Useful for UI hints.
 */
router.get('/detect-mode', (req: Request, res: Response) => {
  const message = req.query.message as string;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message query parameter is required',
    });
  }

  const mode = detectMode(message);

  res.json({
    success: true,
    data: {
      message,
      detectedMode: mode,
      description: getModeDescription(mode),
    },
  });
});

function getModeDescription(mode: string): string {
  switch (mode) {
    case 'brainstorm':
      return 'Free-flowing conversation to explore ideas';
    case 'decide':
      return 'Formalize a decision with light verification';
    case 'export':
      return 'Generate a document from your ideas and decisions';
    default:
      return 'Unknown mode';
  }
}

/**
 * GET /api/simple-chat/stats
 *
 * Compare simplified system stats with complex system.
 */
router.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      system: 'simplified',
      modes: ['brainstorm', 'decide', 'export'],
      apiCallsPerMessage: 1,
      agentCount: 0, // No agents, just modes
      orchestrators: 0,
      comparison: {
        complexSystem: {
          agents: 9,
          orchestrators: 5,
          apiCallsPerMessage: '3-5',
          workflowTypes: 10,
        },
        simplifiedSystem: {
          agents: 0,
          orchestrators: 0,
          apiCallsPerMessage: 1,
          modes: 3,
        },
      },
    },
  });
});

export default router;
