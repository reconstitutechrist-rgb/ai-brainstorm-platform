/**
 * ChatOrchestrator - Page-Specific Orchestrator for ChatPage
 *
 * Coordinates agent workflows specific to conversational brainstorming.
 * Wraps IntegrationOrchestrator logic with ChatPage-specific context.
 *
 * NOTE: This orchestrator delegates to the existing IntegrationOrchestrator
 * while providing a new interface for future migration.
 */

import { ContextManagerAgent } from '../agents/contextManager';
import { IntegrationOrchestrator } from '../agents/orchestrator';
import { supabase } from '../services/supabase';

interface ChatContext {
  projectId: string;
  conversationHistory: any[];
  projectState?: any;
  userId?: string;
}

interface ChatResponse {
  response: string;
  metadata?: {
    intent: string;
    itemsRecorded?: number;
    qualityChecks?: {
      verified: boolean;
      assumptionsFound: number;
      conflictsFound: number;
    };
    nextSteps?: string[];
  };
}

export class ChatOrchestrator {
  private contextManager: ContextManagerAgent;
  private integrationOrchestrator: IntegrationOrchestrator;

  constructor() {
    this.contextManager = new ContextManagerAgent();
    this.integrationOrchestrator = new IntegrationOrchestrator();
  }

  /**
   * Main entry point for ChatPage messages
   * Delegates to IntegrationOrchestrator while providing intent metadata
   */
  async processChatMessage(
    message: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      // Step 1: Classify user intent
      const intentResult = await this.contextManager.classifyIntent(
        message,
        context.conversationHistory
      );

      // Access intent from metadata (correct path for ContextManagerResponse)
      const intentMetadata = intentResult.metadata || {};
      const intent = intentMetadata.type || 'general';

      console.log(`[ChatOrchestrator] Intent classified: ${intent}`);

      // Step 2: Fetch project state if not provided
      let projectState = context.projectState;
      if (!projectState) {
        projectState = await this.getProjectState(context.projectId);
      }

      // Step 3: Determine workflow using IntegrationOrchestrator
      const intentClassification = {
        type: intent,
        confidence: intentMetadata.confidence || 0.8,
        stateChange: intentMetadata.stateChange || undefined,
        conflicts: intentMetadata.conflicts,
        needsClarification: intentMetadata.needsClarification || false,
        reasoning: intentMetadata.reasoning || ''
      };

      const workflow = await this.integrationOrchestrator.determineWorkflow(
        intentClassification,
        message
      );

      // Step 4: Execute workflow
      const workflowResults = await this.integrationOrchestrator.executeWorkflow(
        workflow,
        message,
        projectState,
        context.conversationHistory,
        [] // projectReferences
      );

      // Step 5: Extract user-facing response from results
      const userResponse = workflowResults.find(r => r.showToUser)?.message
        || workflowResults[workflowResults.length - 1]?.message
        || 'Processing complete';

      // Step 6: Wrap response with intent metadata
      return {
        response: userResponse,
        metadata: {
          intent,
          itemsRecorded: 0, // Will be updated by background workflow
          qualityChecks: {
            verified: true,
            assumptionsFound: 0,
            conflictsFound: 0
          },
          nextSteps: this.getNextStepsForIntent(intent)
        }
      };
    } catch (error) {
      console.error('[ChatOrchestrator] Error processing message:', error);
      throw error;
    }
  }

  /**
   * Get project state from database
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
      console.error('[ChatOrchestrator] Error fetching project state:', error);
      return { decided: [], exploring: [], parked: [] };
    }
  }

  /**
   * Get suggested next steps based on intent
   */
  private getNextStepsForIntent(intent: string): string[] {
    const nextStepsMap: Record<string, string[]> = {
      brainstorming: [
        'Let me know when you want to decide on any of these ideas',
        'Feel free to explore more variations',
        'Ask me to park ideas for later if needed'
      ],
      deciding: [
        'Your decision has been recorded',
        'Continue building on this decision',
        'Or move on to the next topic'
      ],
      exploring: [
        'Would you like to decide on any of these options?',
        'I can explore more variations if needed'
      ],
      modifying: [
        'Your changes have been noted',
        'Review the updated decision',
        'Continue refining'
      ],
      parking: [
        'Parked for later consideration',
        'You can revisit these ideas anytime'
      ],
      reviewing: [
        'Continue building your vision',
        'Consider refining any unclear decisions',
        'Move to implementation planning when ready'
      ],
      development: [
        'Consider implementation details',
        'Break down into smaller tasks',
        'Identify dependencies'
      ],
      general: [
        'Keep exploring your ideas',
        'Let me know what you want to focus on next'
      ]
    };

    return nextStepsMap[intent] || nextStepsMap['general'];
  }
}
