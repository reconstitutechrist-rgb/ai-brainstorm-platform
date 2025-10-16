import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { IdeaGeneratorAgent } from '../agents/IdeaGeneratorAgent';
import { ConversationalIdeaAgent, ConversationContext, Message } from '../agents/ConversationalIdeaAgent';

const router = Router();

/**
 * Create new sandbox session
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { projectId, userId, name } = req.body;

    // Get current project state
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Create sandbox record
    const { data: sandbox, error: sandboxError } = await supabase
      .from('sandbox_sessions')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          name: name || 'Sandbox Session',
          original_project_state: project,
          sandbox_state: {
            ideas: [],
            decisions: [],
            explorations: [],
          },
          status: 'active',
        },
      ])
      .select()
      .single();

    if (sandboxError) throw sandboxError;

    res.json({ success: true, sandbox });
  } catch (error) {
    console.error('Create sandbox error:', error);
    res.status(500).json({ success: false, error: 'Failed to create sandbox' });
  }
});

/**
 * Generate ideas using Idea Generator Agent
 */
router.post('/generate-ideas', async (req: Request, res: Response) => {
  try {
    const { sandboxId, projectContext, currentDecisions, constraints, direction, quantity } = req.body;

    const agent = new IdeaGeneratorAgent();
    const result = await agent.generateIdeas({
      projectContext,
      currentDecisions: currentDecisions || [],
      constraints: constraints || [],
      direction: direction || 'innovative',
      quantity: quantity || 5,
    });

    // Save generated ideas to sandbox
    const { data: sandbox, error: fetchError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', sandboxId)
      .single();

    if (fetchError) throw fetchError;

    const updatedState = {
      ...sandbox.sandbox_state,
      ideas: [...(sandbox.sandbox_state.ideas || []), ...result.ideas],
    };

    await supabase
      .from('sandbox_sessions')
      .update({ sandbox_state: updatedState })
      .eq('id', sandboxId);

    res.json({ success: true, ideas: result.ideas });
  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate ideas' });
  }
});

/**
 * Refine a specific idea
 */
router.post('/refine-idea', async (req: Request, res: Response) => {
  try {
    const { ideaId, idea, refinementDirection } = req.body;

    const agent = new IdeaGeneratorAgent();
    const refinedIdea = await agent.refineIdea(ideaId, idea, refinementDirection);

    res.json({ success: true, refinedIdea });
  } catch (error) {
    console.error('Refine idea error:', error);
    res.status(500).json({ success: false, error: 'Failed to refine idea' });
  }
});

/**
 * Combine multiple ideas
 */
router.post('/combine-ideas', async (req: Request, res: Response) => {
  try {
    const { ideas } = req.body;

    const agent = new IdeaGeneratorAgent();
    const combinations = await agent.combineIdeas(ideas);

    res.json({ success: true, combinations });
  } catch (error) {
    console.error('Combine ideas error:', error);
    res.status(500).json({ success: false, error: 'Failed to combine ideas' });
  }
});

/**
 * Extract ideas from sandbox to main project
 */
router.post('/extract-ideas', async (req: Request, res: Response) => {
  try {
    const { sandboxId, selectedIdeaIds } = req.body;

    // Get sandbox
    const { data: sandbox, error: fetchError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', sandboxId)
      .single();

    if (fetchError) throw fetchError;

    // Get selected ideas
    const selectedIdeas = sandbox.sandbox_state.ideas.filter((idea: any) =>
      selectedIdeaIds.includes(idea.id)
    );

    // Add to main project as "exploring" items
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', sandbox.project_id)
      .single();

    if (projectError) throw projectError;

    const newItems = selectedIdeas.map((idea: any) => ({
      id: `item-${Date.now()}-${Math.random()}`,
      text: `${idea.title}: ${idea.description}`,
      state: 'exploring',
      created_at: new Date().toISOString(),
      metadata: {
        fromSandbox: true,
        sandboxId: sandboxId,
        originalIdea: idea,
      },
    }));

    const updatedItems = [...(project.items || []), ...newItems];

    await supabase
      .from('projects')
      .update({ items: updatedItems })
      .eq('id', sandbox.project_id);

    res.json({ success: true, extractedIdeas: newItems });
  } catch (error) {
    console.error('Extract ideas error:', error);
    res.status(500).json({ success: false, error: 'Failed to extract ideas' });
  }
});

/**
 * Save sandbox as alternative version
 */
router.post('/save-as-alternative', async (req: Request, res: Response) => {
  try {
    const { sandboxId, alternativeName } = req.body;

    const { data: sandbox, error } = await supabase
      .from('sandbox_sessions')
      .update({
        status: 'saved_as_alternative',
        name: alternativeName || 'Alternative Version',
      })
      .eq('id', sandboxId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, alternative: sandbox });
  } catch (error) {
    console.error('Save alternative error:', error);
    res.status(500).json({ success: false, error: 'Failed to save alternative' });
  }
});

/**
 * Discard sandbox
 */
router.delete('/:sandboxId', async (req: Request, res: Response) => {
  try {
    const { sandboxId } = req.params;

    const { error } = await supabase
      .from('sandbox_sessions')
      .delete()
      .eq('id', sandboxId);

    if (error) throw error;

    res.json({ success: true, message: 'Sandbox discarded' });
  } catch (error) {
    console.error('Discard sandbox error:', error);
    res.status(500).json({ success: false, error: 'Failed to discard sandbox' });
  }
});

/**
 * Get all sandboxes for a project
 */
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, sandboxes: data });
  } catch (error) {
    console.error('Get sandboxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sandboxes' });
  }
});

/**
 * ============================================
 * CONVERSATIONAL SANDBOX ROUTES
 * ============================================
 */

/**
 * Start a new conversation in a sandbox
 */
router.post('/conversation/start', async (req: Request, res: Response) => {
  try {
    const { sandboxId, projectContext } = req.body;

    // Get sandbox
    const { data: sandbox, error: sandboxError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', sandboxId)
      .single();

    if (sandboxError) throw sandboxError;

    // Create conversation record
    const { data: conversation, error: conversationError } = await supabase
      .from('sandbox_conversations')
      .insert([
        {
          sandbox_id: sandboxId,
          messages: [],
          extracted_ideas: [],
          conversation_context: projectContext || {},
          current_mode: 'exploration',
        },
      ])
      .select()
      .single();

    if (conversationError) throw conversationError;

    // Update sandbox with conversation_id
    await supabase
      .from('sandbox_sessions')
      .update({ conversation_id: conversation.id })
      .eq('id', sandboxId);

    // Generate greeting
    const agent = new ConversationalIdeaAgent();
    const context: ConversationContext = {
      projectTitle: projectContext.projectTitle || 'Your Project',
      projectDescription: projectContext.projectDescription || '',
      currentDecisions: projectContext.currentDecisions || [],
      constraints: projectContext.constraints || [],
      previousTopics: [],
      userPreferences: {},
    };

    const greeting = await agent.generateGreeting(context);

    // Add greeting to messages
    const greetingMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString(),
    };

    await supabase
      .from('sandbox_conversations')
      .update({
        messages: [greetingMessage],
      })
      .eq('id', conversation.id);

    res.json({
      success: true,
      conversation: {
        ...conversation,
        messages: [greetingMessage],
      },
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to start conversation' });
  }
});

/**
 * Send a message in the conversation
 */
router.post('/conversation/message', async (req: Request, res: Response) => {
  try {
    const { conversationId, userMessage, mode } = req.body;

    // Get conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    // Get sandbox for context
    const { data: sandbox, error: sandboxError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', conversation.sandbox_id)
      .single();

    if (sandboxError) throw sandboxError;

    // Get project for context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', sandbox.project_id)
      .single();

    if (projectError) throw projectError;

    // Build context
    const context: ConversationContext = {
      projectTitle: project.title || 'Your Project',
      projectDescription: project.description || '',
      currentDecisions: project.items?.filter((i: any) => i.state === 'decided') || [],
      constraints: conversation.conversation_context?.constraints || [],
      previousTopics: conversation.conversation_context?.previousTopics || [],
      userPreferences: conversation.conversation_context?.userPreferences || {},
    };

    // Create user message
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Get AI response
    const agent = new ConversationalIdeaAgent();
    const response = await agent.respondToUser({
      userMessage,
      context,
      conversationHistory: conversation.messages || [],
      mode: mode || conversation.current_mode,
    });

    // Create assistant message
    const assistantMsg: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: response.response,
      timestamp: new Date().toISOString(),
      metadata: {
        mode: mode || conversation.current_mode,
        extractedIdeas: response.extractedIdeas.map(i => i.id),
        userIntent: response.detectedIntent,
        suggestedActions: response.suggestedActions,
      },
    };

    // Update conversation
    const updatedMessages = [...(conversation.messages || []), userMsg, assistantMsg];
    const updatedExtractedIdeas = [
      ...(conversation.extracted_ideas || []),
      ...response.extractedIdeas,
    ];

    await supabase
      .from('sandbox_conversations')
      .update({
        messages: updatedMessages,
        extracted_ideas: updatedExtractedIdeas,
        current_mode: response.modeShift || mode || conversation.current_mode,
      })
      .eq('id', conversationId);

    // Also update sandbox state with new ideas
    const updatedSandboxIdeas = [
      ...(sandbox.sandbox_state?.ideas || []),
      ...response.extractedIdeas.map(idea => ({
        id: idea.id,
        title: idea.idea.title,
        description: idea.idea.description,
        reasoning: idea.idea.reasoning,
        tags: idea.tags,
        innovationLevel: idea.innovationLevel,
        source: idea.source,
        status: idea.status,
        conversationContext: idea.conversationContext,
      })),
    ];

    await supabase
      .from('sandbox_sessions')
      .update({
        sandbox_state: {
          ...sandbox.sandbox_state,
          ideas: updatedSandboxIdeas,
        },
      })
      .eq('id', sandbox.id);

    res.json({
      success: true,
      message: assistantMsg,
      extractedIdeas: response.extractedIdeas,
      suggestedActions: response.suggestedActions,
      modeShift: response.modeShift,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * Get conversation history
 */
router.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const { data: conversation, error } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

/**
 * Update idea status from conversation
 */
router.patch('/conversation/idea/:ideaId/status', async (req: Request, res: Response) => {
  try {
    const { ideaId } = req.params;
    const { conversationId, status } = req.body;

    // Get conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    // Update idea status
    const updatedIdeas = conversation.extracted_ideas.map((idea: any) =>
      idea.id === ideaId ? { ...idea, status } : idea
    );

    await supabase
      .from('sandbox_conversations')
      .update({ extracted_ideas: updatedIdeas })
      .eq('id', conversationId);

    res.json({ success: true, idea: updatedIdeas.find((i: any) => i.id === ideaId) });
  } catch (error) {
    console.error('Update idea status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update idea status' });
  }
});

/**
 * Extract ideas from conversation to main project
 */
router.post('/conversation/extract', async (req: Request, res: Response) => {
  try {
    const { conversationId, selectedIdeaIds } = req.body;

    // Get conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    // Get sandbox
    const { data: sandbox, error: sandboxError } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', conversation.sandbox_id)
      .single();

    if (sandboxError) throw sandboxError;

    // Get selected ideas
    const selectedIdeas = conversation.extracted_ideas.filter((idea: any) =>
      selectedIdeaIds.includes(idea.id)
    );

    // Add to main project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', sandbox.project_id)
      .single();

    if (projectError) throw projectError;

    const newItems = selectedIdeas.map((idea: any) => ({
      id: `item-${Date.now()}-${Math.random()}`,
      text: `${idea.idea.title}: ${idea.idea.description}`,
      state: 'exploring',
      created_at: new Date().toISOString(),
      metadata: {
        fromSandbox: true,
        fromConversation: true,
        conversationId: conversationId,
        sandboxId: sandbox.id,
        originalIdea: idea,
        userIntent: idea.idea.userIntent,
      },
    }));

    const updatedItems = [...(project.items || []), ...newItems];

    await supabase
      .from('projects')
      .update({ items: updatedItems })
      .eq('id', sandbox.project_id);

    res.json({ success: true, extractedIdeas: newItems });
  } catch (error) {
    console.error('Extract ideas from conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to extract ideas' });
  }
});

export default router;
