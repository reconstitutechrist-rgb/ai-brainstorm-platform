import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { SessionReviewAgent } from '../agents/SessionReviewAgent';
import { ContextGroupingService, ExtractedIdea, TopicGroup } from '../services/ContextGroupingService';
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

    let topicGroups: TopicGroup[];

    // Check if we have cached topic groups
    if (conversation.review_data &&
        conversation.review_data.topicGroups &&
        conversation.review_data.ideaCount === extractedIdeas.length) {
      // Use cached data - instant!
      console.log('[SessionReview] Using cached topic groups (instant!)');
      topicGroups = conversation.review_data.topicGroups;
    } else {
      // No cache or stale - generate fresh (fallback)
      console.log('[SessionReview] Generating fresh topic groups (cache miss or stale)');
      const contextGroupingService = new ContextGroupingService();
      topicGroups = await contextGroupingService.groupIdeasByContext(
        extractedIdeas,
        messages
      );
    }

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
    console.log('[parse-decisions] Starting parse-decisions endpoint');
    const { conversationId, userDecisions } = req.body;
    console.log('[parse-decisions] conversationId:', conversationId);
    console.log('[parse-decisions] userDecisions:', userDecisions);

    if (!conversationId || !userDecisions) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and user decisions are required',
      });
    }

    // Get conversation
    console.log('[parse-decisions] Fetching conversation from database...');
    const { data: conversation, error: convError } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    console.log('[parse-decisions] Conversation fetched');

    if (convError || !conversation) {
      console.error('[parse-decisions] Conversation not found:', convError);
      return res.status(400).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const extractedIdeas: ExtractedIdea[] = conversation.extracted_ideas || [];
    const messages = conversation.messages || [];
    console.log(`[parse-decisions] Found ${extractedIdeas.length} ideas, ${messages.length} messages`);

    // Use cached topic groups from review_data if available
    console.log('[parse-decisions] Checking for cached topic groups...');
    let topicGroups = conversation.review_data?.topicGroups || [];

    if (topicGroups.length === 0) {
      // Fallback: Group ideas by context if not cached
      console.log('[parse-decisions] No cached groups, starting context grouping...');
      const contextGroupingService = new ContextGroupingService();
      topicGroups = await contextGroupingService.groupIdeasByContext(
        extractedIdeas,
        messages
      );
      console.log(`[parse-decisions] Context grouping complete, found ${topicGroups.length} topic groups`);
    } else {
      console.log(`[parse-decisions] Using cached topic groups (${topicGroups.length} groups)`);
    }

    // Parse decisions
    console.log('[parse-decisions] Starting decision parsing...');
    const agent = new SessionReviewAgent();
    const parsedDecisions = await agent.parseDecisions(
      userDecisions,
      extractedIdeas,
      topicGroups
    );
    console.log('[parse-decisions] Decision parsing complete');

    res.json({
      success: true,
      parsedDecisions,
    });
    console.log('[parse-decisions] Response sent successfully');
  } catch (error: any) {
    console.error('[parse-decisions] ERROR:', error);
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

    // Respond immediately - process in background
    res.json({
      success: true,
      message: 'Session finalization started',
      processing: true
    });

    // Complete the session in background (fire-and-forget)
    const completionService = new SessionCompletionService(supabase);
    completionService.completeSession(conversationId, finalDecisions)
      .then(summary => {
        console.log('[SessionFinalize] Background completion successful:', summary.sessionName);
      })
      .catch(error => {
        console.error('[SessionFinalize] Background completion failed:', error);
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
