import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { SuggestionAgent } from '../agents/suggestionAgent';

const router = Router();
const suggestionAgent = new SuggestionAgent(supabase);

/**
 * Create new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, userId } = req.body;

    console.log('📝 Create project request:', { title, description, userId });

    if (!title || !userId) {
      console.error('❌ Missing required fields:', { title: !!title, userId: !!userId });
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

    if (error) {
      console.error('❌ Supabase error creating project:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ Project created successfully:', data.id);
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

    console.log('📋 Get projects request for userId:', userId);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error fetching projects:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} projects for user`);
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
 * Dismiss a suggestion
 */
router.post('/:projectId/suggestions/:suggestionId/dismiss', async (req: Request, res: Response) => {
  try {
    const { projectId, suggestionId } = req.params;
    const { userId, suggestionType, suggestionTitle } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Record dismissal
    const { error: dismissError } = await supabase
      .from('suggestion_dismissals')
      .insert({
        user_id: userId,
        project_id: projectId,
        suggestion_id: suggestionId,
        suggestion_type: suggestionType,
        suggestion_title: suggestionTitle,
      });

    if (dismissError) {
      console.error('Error recording dismissal:', dismissError);
      throw dismissError;
    }

    // Record feedback
    const { error: feedbackError } = await supabase
      .from('suggestion_feedback')
      .insert({
        user_id: userId,
        project_id: projectId,
        suggestion_id: suggestionId,
        suggestion_type: suggestionType,
        feedback_type: 'dismiss',
        suggestion_priority: req.body.suggestionPriority,
        suggestion_agent_type: req.body.suggestionAgentType,
      });

    if (feedbackError) {
      console.error('Error recording feedback:', feedbackError);
    }

    // Update analytics
    await supabase.rpc('update_suggestion_analytics', {
      p_project_id: projectId,
      p_suggestion_type: suggestionType,
      p_feedback_type: 'dismiss'
    });

    res.json({ success: true, message: 'Suggestion dismissed' });
  } catch (error) {
    console.error('Dismiss suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss suggestion' });
  }
});

/**
 * Record feedback on a suggestion
 */
router.post('/:projectId/suggestions/:suggestionId/feedback', async (req: Request, res: Response) => {
  try {
    const { projectId, suggestionId } = req.params;
    const { userId, suggestionType, feedbackType, timeToActionSeconds, suggestionPriority, suggestionAgentType } = req.body;

    if (!userId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'userId and feedbackType are required'
      });
    }

    // Record feedback
    const { error: feedbackError } = await supabase
      .from('suggestion_feedback')
      .insert({
        user_id: userId,
        project_id: projectId,
        suggestion_id: suggestionId,
        suggestion_type: suggestionType,
        feedback_type: feedbackType,
        applied: feedbackType === 'accept',
        time_to_action_seconds: timeToActionSeconds,
        suggestion_priority: suggestionPriority,
        suggestion_agent_type: suggestionAgentType,
      });

    if (feedbackError) {
      console.error('Error recording feedback:', feedbackError);
      throw feedbackError;
    }

    // Update analytics
    await supabase.rpc('update_suggestion_analytics', {
      p_project_id: projectId,
      p_suggestion_type: suggestionType,
      p_feedback_type: feedbackType,
      p_time_to_action: timeToActionSeconds
    });

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('Record feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to record feedback' });
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
        project.status, // Pass project status as recent activity indicator
        projectId // Pass projectId for canvas organization suggestions
      );
    }

    // Filter out dismissed suggestions if userId is provided
    const userId = req.query.userId as string | undefined;
    let filteredSuggestions = suggestions;
    
    if (userId) {
      const { data: dismissedSuggestions } = await supabase
        .from('suggestion_dismissals')
        .select('suggestion_id')
        .eq('user_id', userId)
        .eq('project_id', projectId);

      if (dismissedSuggestions && dismissedSuggestions.length > 0) {
        const dismissedIds = new Set(dismissedSuggestions.map(d => d.suggestion_id));
        filteredSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));
      }
    }

    // Note: The suggestionAgent already handles stale-while-revalidate internally
    // It returns cached data (stale or fresh) immediately and regenerates in background if stale
    res.json({ success: true, suggestions: filteredSuggestions });
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
