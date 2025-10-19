import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { SuggestionAgent } from '../agents/suggestionAgent';

const router = Router();
const suggestionAgent = new SuggestionAgent();

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

/**
 * Get AI-generated suggestions for a project
 */
router.get('/:projectId/suggestions', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Fetch conversation history for this project
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(20); // Get last 20 messages for context

    if (messagesError) throw messagesError;

    // Build project state from items
    const items = project.items || [];
    const projectState = {
      decided: items.filter((i: any) => i.state === 'decided'),
      exploring: items.filter((i: any) => i.state === 'exploring'),
      parked: items.filter((i: any) => i.state === 'parked'),
    };

    // Check if this is a new project with no activity
    const isNewProject = items.length === 0 && (messages?.length || 0) === 0;

    let suggestions;
    if (isNewProject) {
      // Generate onboarding suggestions for new projects
      suggestions = await suggestionAgent.generateOnboardingSuggestions(project.title);
    } else {
      // Generate contextual suggestions based on project state
      suggestions = await suggestionAgent.generateSuggestions(
        projectState,
        messages || [],
        project.status // Pass project status as recent activity indicator
      );
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Generate suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;