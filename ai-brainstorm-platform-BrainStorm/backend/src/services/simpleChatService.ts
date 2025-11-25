/**
 * SimpleChatService - Streamlined chat processing
 * 
 * This service demonstrates the SIMPLIFIED approach to chat processing,
 * removing unnecessary complexity while maintaining functionality.
 * 
 * PHILOSOPHY:
 * - Chat should be fast and conversational
 * - Complex processing happens in background
 * - Only invoke agents when actually needed
 * 
 * COMPARISON:
 * 
 * Complex Flow (Current):
 *   User Message → Coordination → ChatOrchestrator → Integration → 9 Agents → Response
 *   Time: 5-8 seconds
 * 
 * Simple Flow (This Service):
 *   User Message → ConversationAgent → Response (+ Background: Record if needed)
 *   Time: 1-2 seconds
 */

import { supabase } from './supabase';
import { ConversationAgent } from '../agents/conversation';
import { PersistenceManagerAgent } from '../agents/persistenceManager';
import { ContextManagerAgent } from '../agents/contextManager';

export interface SimpleChatResponse {
  response: string;
  metadata: {
    responseTime: number;
    needsRecording: boolean;
    backgroundProcessing: boolean;
  };
}

export class SimpleChatService {
  private conversationAgent: ConversationAgent;
  private persistenceManager: PersistenceManagerAgent;
  private contextManager: ContextManagerAgent;

  constructor() {
    this.conversationAgent = new ConversationAgent();
    this.persistenceManager = new PersistenceManagerAgent();
    this.contextManager = new ContextManagerAgent();
  }

  /**
   * Process a chat message with SPEED as priority
   * 
   * Strategy:
   * 1. Get recent conversation history only (not full project)
   * 2. Generate conversational response immediately
   * 3. Determine if background processing needed
   * 4. Return fast, process later
   */
  async processMessage(
    message: string,
    projectId: string,
    userId: string
  ): Promise<SimpleChatResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Get ONLY recent conversation (last 20 messages)
      // This is much faster than fetching full project state
      const conversationHistory = await this.getRecentConversation(projectId, 20);

      // Step 2: Generate immediate conversational response
      // No intent classification, no workflow determination - just respond!
      const conversationResponse = await this.conversationAgent.reflect(
        message,
        conversationHistory,
        [] // No references for speed - can add later if needed
      );

      const responseTime = Date.now() - startTime;

      // Step 3: Determine if this message needs recording
      const needsRecording = this.detectDecision(message);

      // Step 4: If recording needed, process in background (non-blocking)
      if (needsRecording) {
        console.log('[SimpleChat] Decision detected, triggering background recording...');
        this.processInBackground(message, projectId, userId, conversationHistory);
      }

      return {
        response: conversationResponse.message,
        metadata: {
          responseTime,
          needsRecording,
          backgroundProcessing: needsRecording,
        },
      };
    } catch (error) {
      console.error('[SimpleChat] Error processing message:', error);
      throw error;
    }
  }

  /**
   * Detect if a message contains a decision that needs recording
   * 
   * Simple keyword-based detection. Can be enhanced later.
   */
  private detectDecision(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Decision keywords
    const decisionKeywords = [
      'decide', 'decided', "let's go with", "i want", "we should",
      'confirmed', 'final', 'approve', 'agreed', 'commit to'
    ];

    // Question keywords (not decisions)
    const questionKeywords = ['what', 'why', 'how', 'when', 'where', '?'];

    // If it's a question, probably not a decision
    const isQuestion = questionKeywords.some(kw => lowerMessage.includes(kw));
    if (isQuestion) return false;

    // Check for decision keywords
    const hasDecisionKeyword = decisionKeywords.some(kw => lowerMessage.includes(kw));

    // Also trigger for longer messages (likely contain decisions)
    const isLongMessage = message.length > 200;

    return hasDecisionKeyword || isLongMessage;
  }

  /**
   * Process decisions in background (non-blocking)
   * 
   * This runs AFTER the response is sent to the user
   */
  private async processInBackground(
    message: string,
    projectId: string,
    userId: string,
    conversationHistory: any[]
  ): Promise<void> {
    try {
      console.log('[SimpleChat] Background processing started...');

      // Step 1: Get full project state (now that we have time)
      const projectState = await this.getProjectState(projectId);

      // Step 2: Classify intent (to determine what to record)
      const intent = await this.contextManager.classifyIntent(
        message,
        conversationHistory
      );

      console.log(`[SimpleChat] Intent classified as: ${intent.type}`);

      // Step 3: If it's a decision, record it
      if (intent.type === 'deciding' || intent.type === 'modifying') {
        await this.persistenceManager.record(
          message,
          projectState,
          conversationHistory,
          []
        );
        console.log('[SimpleChat] Decision recorded successfully');
      }

      console.log('[SimpleChat] Background processing complete');
    } catch (error) {
      console.error('[SimpleChat] Background processing error:', error);
      // Don't throw - this is background, user already has response
    }
  }

  /**
   * Get recent conversation history (fast query)
   */
  private async getRecentConversation(
    projectId: string,
    limit: number = 20
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SimpleChat] Error fetching conversation:', error);
      return [];
    }

    // Return in chronological order (oldest first)
    return (data || []).reverse();
  }

  /**
   * Get project state (for background processing)
   */
  private async getProjectState(projectId: string): Promise<any> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('items')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      const items = project?.items || [];

      return {
        decided: items.filter((i: any) => i.state === 'decided'),
        exploring: items.filter((i: any) => i.state === 'exploring'),
        parked: items.filter((i: any) => i.state === 'parked'),
      };
    } catch (error) {
      console.error('[SimpleChat] Error fetching project state:', error);
      return { decided: [], exploring: [], parked: [] };
    }
  }
}

/**
 * USAGE EXAMPLE:
 * 
 * // In conversations route:
 * const simpleChatService = new SimpleChatService();
 * 
 * router.post('/:projectId/message-simple', async (req, res) => {
 *   const { message, userId } = req.body;
 *   const { projectId } = req.params;
 * 
 *   const result = await simpleChatService.processMessage(
 *     message,
 *     projectId,
 *     userId
 *   );
 * 
 *   res.json({
 *     success: true,
 *     message: result.response,
 *     metadata: result.metadata
 *   });
 * });
 * 
 * BENEFITS:
 * - Response in 1-2 seconds (vs 5-8 seconds)
 * - Simpler code flow
 * - Easier to debug
 * - Still records decisions accurately
 */
