import { Router, Request, Response } from 'express';
import { AgentCoordinationService } from '../services/agentCoordination';
import { supabase } from '../services/supabase';

const router = Router();
const coordinationService = new AgentCoordinationService();

/**
 * Get agent system stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = coordinationService.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        status: 'online',
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * Get agent activity log for project
 */
router.get('/activity/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error } = await supabase
      .from('agent_activity')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, activity: data });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

/**
 * Get available agents list
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const agents = [
      {
        id: 'brainstorming',
        name: 'Brainstorming Agent',
        description: 'Reflects and organizes your ideas',
        category: 'core',
        status: 'active',
      },
      {
        id: 'questioner',
        name: 'Questioner Agent',
        description: 'Asks strategic questions',
        category: 'core',
        status: 'active',
      },
      {
        id: 'recorder',
        name: 'Recorder Agent',
        description: 'Documents decisions with context',
        category: 'core',
        status: 'active',
      },
      {
        id: 'contextManager',
        name: 'Context Manager Agent',
        description: 'Manages project state and intent',
        category: 'core',
        status: 'active',
      },
      {
        id: 'development',
        name: 'Development Agent',
        description: 'Research and vendor recommendations',
        category: 'core',
        status: 'active',
      },
      {
        id: 'verification',
        name: 'Verification Agent',
        description: 'Blocks assumptions, ensures accuracy',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'gapDetection',
        name: 'Gap Detection Agent',
        description: 'Identifies missing information',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'clarification',
        name: 'Clarification Agent',
        description: 'Asks targeted clarifying questions',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'accuracyAuditor',
        name: 'Accuracy Auditor Agent',
        description: 'Continuous accuracy validation',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'assumptionBlocker',
        name: 'Assumption Blocker Agent',
        description: 'Prevents all assumptions',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'referenceAnalysis',
        name: 'Reference Analysis Agent',
        description: 'Analyzes images, videos, products',
        category: 'quality',
        status: 'active',
      },
      {
        id: 'consistencyGuardian',
        name: 'Consistency Guardian Agent',
        description: 'Detects contradictions',
        category: 'support',
        status: 'active',
      },
      {
        id: 'translation',
        name: 'Translation Agent',
        description: 'Converts vision to technical specs',
        category: 'support',
        status: 'active',
      },
      {
        id: 'prioritization',
        name: 'Prioritization Agent',
        description: 'Sequences decisions',
        category: 'support',
        status: 'active',
      },
      {
        id: 'versionControl',
        name: 'Version Control Agent',
        description: 'Tracks changes with reasoning',
        category: 'support',
        status: 'active',
      },
      {
        id: 'reviewer',
        name: 'Reviewer Agent',
        description: 'Comprehensive QA validation',
        category: 'support',
        status: 'active',
      },
      {
        id: 'resourceManager',
        name: 'Resource Manager Agent',
        description: 'Organizes references and materials',
        category: 'support',
        status: 'active',
      },
      {
        id: 'orchestrator',
        name: 'Integration Orchestrator',
        description: 'Coordinates all agents',
        category: 'meta',
        status: 'active',
      },
    ];

    res.json({ success: true, agents, totalCount: agents.length });
  } catch (error) {
    console.error('Get agents list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agents list' });
  }
});

export default router;
