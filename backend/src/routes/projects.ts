import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

/**
 * Create new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, userId } = req.body;

    if (!title || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Title and userId are required'
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          title: title,
          description: description || '',
          status: 'exploring',
          items: [],
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

/**
 * Get all projects for user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, projects: data });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * Get single project
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

/**
 * Update project
 */
router.patch('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

/**
 * Delete project
 */
router.delete('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

/**
 * Update project items (state changes)
 */
router.patch('/:projectId/items', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { items } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({
        items: items,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, project: data });
  } catch (error) {
    console.error('Update items error:', error);
    res.status(500).json({ success: false, error: 'Failed to update items' });
  }
});

export default router;