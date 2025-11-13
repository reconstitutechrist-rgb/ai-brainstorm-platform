import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { CanvasAnalysisService } from '../services/canvasAnalysisService';

const router = Router();
const canvasService = new CanvasAnalysisService(supabase);

/**
 * Auto-generate and apply clustering to a project's canvas
 */
router.post('/:projectId/auto-cluster', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { threshold = 5 } = req.body || {};

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const items = project.items || [];
    const activeItems = items.filter((item: any) => !item.isArchived);

    // Check if we have enough items to cluster
    if (activeItems.length < threshold) {
      return res.json({
        success: true,
        message: `Not enough cards to cluster (need ${threshold}, have ${activeItems.length})`,
        clustered: false
      });
    }

    // Generate clusters using AI
    console.log(`[AutoCluster] Generating clusters for project ${projectId} with ${activeItems.length} cards`);
    const clusters = await canvasService.analyzeCardsForClustering(activeItems, threshold);

    if (clusters.length === 0) {
      return res.json({
        success: true,
        message: 'No meaningful clusters found',
        clustered: false
      });
    }

    // Apply clustering to project
    const updatedProject = await canvasService.applyClustering(projectId, clusters);

    res.json({
      success: true,
      clustered: true,
      project: updatedProject,
      clustersCreated: clusters.length,
      message: `Auto-clustered ${activeItems.length} cards into ${clusters.length} groups`
    });
  } catch (error) {
    console.error('Auto-cluster error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-cluster cards',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Apply clustering to a project's canvas
 */
router.post('/:projectId/cluster', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { clusters } = req.body;

    if (!clusters || !Array.isArray(clusters)) {
      return res.status(400).json({
        success: false,
        error: 'Clusters array is required'
      });
    }

    const updatedProject = await canvasService.applyClustering(projectId, clusters);

    res.json({
      success: true,
      project: updatedProject,
      message: `Applied ${clusters.length} clusters to canvas`
    });
  } catch (error) {
    console.error('Apply clustering error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply clustering',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Archive cards by IDs
 */
router.post('/:projectId/archive', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({
        success: false,
        error: 'cardIds array is required'
      });
    }

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('Project not found');
    }

    const items = project.items || [];

    // Mark specified cards as archived
    const updatedItems = items.map((item: any) => {
      if (cardIds.includes(item.id)) {
        return {
          ...item,
          isArchived: true,
          archivedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      project: updatedProject,
      message: `Archived ${cardIds.length} cards`
    });
  } catch (error) {
    console.error('Archive cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive cards',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Restore (unarchive) cards
 */
router.post('/:projectId/restore', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { cardIds } = req.body;

    if (!cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({
        success: false,
        error: 'cardIds array is required'
      });
    }

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('Project not found');
    }

    const items = project.items || [];

    // Mark specified cards as not archived
    const updatedItems = items.map((item: any) => {
      if (cardIds.includes(item.id)) {
        return {
          ...item,
          isArchived: false,
          archivedAt: undefined,
        };
      }
      return item;
    });

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      project: updatedProject,
      message: `Restored ${cardIds.length} cards`
    });
  } catch (error) {
    console.error('Restore cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore cards',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Clear clusters from project (for testing/debugging)
 */
router.post('/:projectId/clear-clusters', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('Project not found');
    }

    const items = project.items || [];

    // Remove clusterId from all items
    const cleanedItems = items.map((item: any) => {
      const { clusterId, ...rest } = item;
      return rest;
    });

    // Update project with cleaned items and empty clusters
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        items: cleanedItems,
        clusters: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      project: updatedProject,
      message: 'Cleared all clusters from project'
    });
  } catch (error) {
    console.error('Clear clusters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear clusters',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Optimize layout - arrange cards in a clean grid
 */
router.post('/:projectId/optimize-layout', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { layout = 'grid' } = req.body;

    // Fetch project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error('Project not found');
    }

    const items = project.items || [];
    const activeItems = items.filter((item: any) => !item.isArchived);

    // Apply grid layout
    const GRID_SPACING_X = 280;
    const GRID_SPACING_Y = 200;
    const CARDS_PER_ROW = 4;
    const START_X = 100;
    const START_Y = 100;

    const updatedItems = items.map((item: any, index: number) => {
      if (item.isArchived) {
        return item; // Don't move archived cards
      }

      const activeIndex = activeItems.findIndex((ai: any) => ai.id === item.id);
      const row = Math.floor(activeIndex / CARDS_PER_ROW);
      const col = activeIndex % CARDS_PER_ROW;

      return {
        ...item,
        position: {
          x: START_X + (col * GRID_SPACING_X),
          y: START_Y + (row * GRID_SPACING_Y),
        },
      };
    });

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        items: updatedItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      project: updatedProject,
      message: `Optimized layout for ${activeItems.length} cards`
    });
  } catch (error) {
    console.error('Optimize layout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize layout',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
