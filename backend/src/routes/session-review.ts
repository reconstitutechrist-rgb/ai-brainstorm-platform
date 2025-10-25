import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { SessionReviewAgent } from '../agents/SessionReviewAgent';
import { ContextGroupingService, ExtractedIdea } from '../services/contextGroupingService';
import { SessionCompletionService } from '../services/sessionCompletionService';

const router = Router();

/**
 * POST /api/session-review/detect-end-intent
 * Detect if user wants to end the brainstorm session
 */
router.post('/detect-end-intent', async (req: Request, res: Response) => {
  try {
    const { userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        message: 'User message is required',
      });
    }

    const agent = new SessionReviewAgent();
    const result = await agent.detectEndSessionIntent(userMessage);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Detect end intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to detect end intent',
    });
  }
});

/**
 * POST /api/session-review/generate-summary
 * Generate review summary with grouped ideas
 */
router.post('/generate-summary', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
    }

    // Get conversation with extracted ideas
    const { data: conversation, error: convError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const extractedIdeas: ExtractedIdea[] = conversation.extracted_ideas || [];
    const messages = conversation.messages || [];

    // Group ideas by context
    const contextGroupingService = new ContextGroupingService();
    const topicGroups = await contextGroupingService.groupIdeasByContext(
      extractedIdeas,
      messages
    );

    // Generate review summary
    const agent = new SessionReviewAgent();
    const summary = await agent.generateReviewSummary(topicGroups);

    // Update conversation status to reviewing
    await supabase
      .from('sandbox_conversations')
      .update({ session_status: 'reviewing' })
      .eq('id', conversationId);

    res.json({
      success: true,
      summary,
      topicGroups,
    });
  } catch (error: any) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate summary',
    });
  }
});

/**
 * POST /api/session-review/parse-decisions
 * Parse user's natural language decisions
 */
router.post('/parse-decisions', async (req: Request, res: Response) => {
  try {
    const { conversationId, userDecisions } = req.body;

    if (!conversationId || !userDecisions) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and user decisions are required',
      });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const extractedIdeas: ExtractedIdea[] = conversation.extracted_ideas || [];
    const messages = conversation.messages || [];

    // Group ideas by context first
    const contextGroupingService = new ContextGroupingService();
    const topicGroups = await contextGroupingService.groupIdeasByContext(
      extractedIdeas,
      messages
    );

    // Parse decisions
    const agent = new SessionReviewAgent();
    const parsedDecisions = await agent.parseDecisions(
      userDecisions,
      extractedIdeas,
      topicGroups
    );

    res.json({
      success: true,
      parsedDecisions,
    });
  } catch (error: any) {
    console.error('Parse decisions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse decisions',
    });
  }
});

/**
 * POST /api/session-review/generate-confirmation
 * Generate final confirmation message
 */
router.post('/generate-confirmation', async (req: Request, res: Response) => {
  try {
    const { parsedDecisions } = req.body;

    if (!parsedDecisions) {
      return res.status(400).json({
        success: false,
        message: 'Parsed decisions are required',
      });
    }

    const agent = new SessionReviewAgent();
    const confirmation = await agent.generateConfirmation(parsedDecisions);

    res.json({
      success: true,
      confirmation,
    });
  } catch (error: any) {
    console.error('Generate confirmation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate confirmation',
    });
  }
});

/**
 * POST /api/session-review/finalize
 * Finalize session and trigger document generation
 */
router.post('/finalize', async (req: Request, res: Response) => {
  try {
    const { conversationId, finalDecisions } = req.body;

    if (!conversationId || !finalDecisions) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and final decisions are required',
      });
    }

    // Complete the session
    const completionService = new SessionCompletionService(supabase);
    const summary = await completionService.completeSession(
      conversationId,
      finalDecisions
    );

    res.json({
      success: true,
      sessionSummary: summary,
    });
  } catch (error: any) {
    console.error('Finalize session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to finalize session',
    });
  }
});

/**
 * POST /api/session-review/cancel
 * Cancel session review and return to active conversation
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
    }

    // Update conversation status back to active
    const { error } = await supabase
      .from('sandbox_conversations')
      .update({ session_status: 'active' })
      .eq('id', conversationId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Session review cancelled',
    });
  } catch (error: any) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel session',
    });
  }
});

export default router;
