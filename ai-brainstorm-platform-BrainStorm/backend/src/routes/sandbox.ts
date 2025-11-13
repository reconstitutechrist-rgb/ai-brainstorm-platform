import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { IdeaGeneratorAgent } from '../agents/IdeaGeneratorAgent';
import { ConversationalIdeaAgent, ConversationContext, Message } from '../agents/ConversationalIdeaAgent';
import { ContextGroupingService, ExtractedIdea, TopicGroup } from '../services/ContextGroupingService';

const router = Router();

/**
 * Background function to update topic groups cache
 * Runs after each conversation message to keep review data fresh
 */
async function updateTopicGroupsInBackground(
  conversationId: string,
  ideas: ExtractedIdea[],
  messages: Message[]
): Promise<void> {
  try {
    console.log(`[Background] Updating topic groups for conversation ${conversationId}`);

    const contextGroupingService = new ContextGroupingService();
    const topicGroups = await contextGroupingService.groupIdeasByContext(ideas, messages);

    const reviewData = {
      topicGroups,
      lastUpdated: new Date().toISOString(),
      ideaCount: ideas.length,
    };

    await supabase
      .from('sandbox_conversations')
      .update({ review_data: reviewData })
      .eq('id', conversationId);

    console.log(`[Background] Topic groups cached successfully (${topicGroups.length} groups, ${ideas.length} ideas)`);
  } catch (error) {
    // Gracefully handle errors - don't block user experience
    console.error('[Background] Failed to update topic groups:', error);
  }
}

/**
 * Background function to handle all persistence operations
 * Uses AI-powered extraction to capture natural conversation ideas
 * This allows the conversational AI to respond instantly (2-3 seconds)
 */
async function handlePersistenceInBackground(
  conversationId: string,
  sandboxId: string,
  userMessage: string,
  aiResponse: string,
  messages: Message[],
  currentExtractedIdeas: ExtractedIdea[],
  sandboxState: any,
  context: any
): Promise<void> {
  try {
    console.log(`[Background] Starting AI-powered idea extraction for conversation ${conversationId}`);

    // Use intelligent AI-based extraction instead of regex patterns
    const agent = new ConversationalIdeaAgent();

    // Review the latest exchange (last 2 messages) for new ideas
    const latestMessages = messages.slice(-2);
    const extractedIdeas = await agent.reviewConversationForIdeas(
      latestMessages,
      context,
      currentExtractedIdeas
    );

    if (extractedIdeas.length > 0) {
      console.log(`[Background] AI extracted ${extractedIdeas.length} new ideas from conversation`);
    } else {
      console.log(`[Background] No new ideas found in this exchange`);
    }

    // Update conversation with extracted ideas
    const updatedExtractedIdeas = [...currentExtractedIdeas, ...extractedIdeas];

    await supabase
      .from('sandbox_conversations')
      .update({
        extracted_ideas: updatedExtractedIdeas,
      })
      .eq('id', conversationId);

    // Update sandbox state with new ideas
    const updatedSandboxIdeas = [
      ...(sandboxState?.ideas || []),
      ...extractedIdeas.map(idea => ({
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
          ...sandboxState,
          ideas: updatedSandboxIdeas,
        },
      })
      .eq('id', sandboxId);

    // Update topic groups cache
    await updateTopicGroupsInBackground(conversationId, updatedExtractedIdeas, messages);

    console.log(`[Background] Persistence complete for conversation ${conversationId}`);
  } catch (error) {
    console.error('[Background] Persistence failed:', error);
  }
}

/**
 * Background function to handle conversation review
 * Finds missed ideas and updates everything in background
 */
async function handleReviewInBackground(
  conversationId: string,
  sandboxId: string,
  messages: Message[],
  context: any,
  currentExtractedIdeas: ExtractedIdea[],
  sandboxState: any
): Promise<void> {
  try {
    console.log(`[Background] Starting review for conversation ${conversationId}`);

    // Review conversation for missed ideas
    const agent = new ConversationalIdeaAgent();
    const newIdeas = await agent.reviewConversationForIdeas(
      messages,
      context,
      currentExtractedIdeas
    );

    if (newIdeas.length > 0) {
      console.log(`[Background] Review found ${newIdeas.length} new ideas`);
    }

    // Update conversation with new ideas
    const updatedExtractedIdeas = [...currentExtractedIdeas, ...newIdeas];

    await supabase
      .from('sandbox_conversations')
      .update({
        extracted_ideas: updatedExtractedIdeas,
      })
      .eq('id', conversationId);

    // Update sandbox state with new ideas
    const updatedSandboxIdeas = [
      ...(sandboxState?.ideas || []),
      ...newIdeas.map(idea => ({
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
          ...sandboxState,
          ideas: updatedSandboxIdeas,
        },
      })
      .eq('id', sandboxId);

    // Update topic groups cache
    await updateTopicGroupsInBackground(conversationId, updatedExtractedIdeas, messages);

    console.log(`[Background] Review complete for conversation ${conversationId}`);
  } catch (error) {
    console.error('[Background] Review failed:', error);
  }
}

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

    // Get AI response FAST (without idea extraction)
    const agent = new ConversationalIdeaAgent();
    const response = await agent.getQuickResponse({
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
        extractedIdeas: [], // Will be populated by background process
        userIntent: response.detectedIntent,
        suggestedActions: [], // Will be populated by background process
      },
    };

    // Update conversation with messages ONLY (fast)
    const updatedMessages = [...(conversation.messages || []), userMsg, assistantMsg];

    await supabase
      .from('sandbox_conversations')
      .update({
        messages: updatedMessages,
        current_mode: response.modeShift || mode || conversation.current_mode,
      })
      .eq('id', conversationId);

    // Send response to user IMMEDIATELY
    res.json({
      success: true,
      message: assistantMsg,
      extractedIdeas: [], // Ideas will appear shortly via live updates
      suggestedActions: [],
      modeShift: response.modeShift,
    });

    // Fire-and-forget: Let PersistenceManager handle idea extraction and all updates in background
    handlePersistenceInBackground(
      conversationId,
      sandbox.id,
      userMessage,
      response.response,
      updatedMessages,
      conversation.extracted_ideas || [],
      sandbox.sandbox_state,
      context
    ).catch((err: any) => {
      console.error('[Background] Persistence failed:', err);
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
 * Review conversation and extract missed ideas (INSTANT - background processing)
 */
router.post('/conversation/review', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;

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
    const context = {
      projectTitle: project.title || 'Your Project',
      projectDescription: project.description || '',
      currentDecisions: project.items?.filter((i: any) => i.state === 'decided') || [],
      constraints: conversation.conversation_context?.constraints || [],
      previousTopics: conversation.conversation_context?.previousTopics || [],
      userPreferences: conversation.conversation_context?.userPreferences || {},
    };

    // Respond IMMEDIATELY - review happens in background
    res.json({
      success: true,
      message: 'Review started - new ideas will appear shortly',
      currentIdeas: conversation.extracted_ideas?.length || 0,
    });

    // Fire-and-forget: Handle review in background
    handleReviewInBackground(
      conversationId,
      sandbox.id,
      conversation.messages || [],
      context,
      conversation.extracted_ideas || [],
      sandbox.sandbox_state
    ).catch(err => {
      console.error('[Background] Review failed:', err);
    });
  } catch (error) {
    console.error('Review conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to review conversation' });
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
