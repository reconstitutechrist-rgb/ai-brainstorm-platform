import { Message } from '../types';

/**
 * ContextPruner - Smart context pruning for AI agents
 *
 * Each agent has different context needs. This service provides agent-specific
 * pruning rules to reduce token usage while preserving necessary information.
 *
 * Key principle: Remove irrelevant history (noise) while keeping signal:
 * - System prompts (instructions) are ALWAYS sent
 * - Current user message is ALWAYS included
 * - Project state is ALWAYS included
 * - Only CONVERSATION HISTORY is pruned based on agent needs
 */

interface PruningStats {
  originalCount: number;
  prunedCount: number;
  tokensSaved: number; // Approximate
  agentName: string;
}

export class ContextPruner {
  // Agent-specific pruning rules based on analysis of their system prompts
  private readonly PRUNING_RULES: Record<string, number | 'decisions_only' | 'tasks_only'> = {
    // Verification agents - only need immediate context
    'assumptionBlocker': 3,        // Scan current message for assumptions
    'verification': 5,             // Verify current message only
    'accuracyAuditor': 15,         // Audit recent accuracy

    // Content generation agents - need recent discussion flow
    'brainstorming': 10,           // Recent brainstorming flow
    'questioner': 10,              // Strategic questions need context
    'clarification': 8,            // Clarifying questions

    // Recording agents - need current decision + state
    'recorder': 5,                 // Record current decision
    'versionControl': 5,           // Track recent changes

    // Analysis agents - need relevant history
    'gapDetection': 10,            // Identify missing information
    'referenceAnalysis': 5,        // Current message + references
    'resourceManager': 10,         // Resource organization context

    // Strategic agents - need broader context
    'consistencyGuardian': 'decisions_only', // All decisions for consistency check
    'prioritization': 'tasks_only',          // All tasks for prioritization
    'reviewer': 30,                          // Review needs broader context

    // Translation and development - moderate context
    'translation': 10,             // Vision to specs
    'development': 15,             // Research and implementation

    // Context management
    'contextManager': 10,          // Intent classification context
  };

  /**
   * Prune conversation history for a specific agent
   */
  pruneForAgent(
    agentName: string,
    conversationHistory: any[],
    projectState: any
  ): { prunedHistory: any[]; stats: PruningStats } {
    const rule = this.PRUNING_RULES[agentName];

    // If no rule defined, use conservative default (last 20 messages)
    if (!rule) {
      console.log(`[ContextPruner] No rule for ${agentName}, using default (20 messages)`);
      return this.pruneToCount(agentName, conversationHistory, 20);
    }

    // Handle special pruning rules
    if (rule === 'decisions_only') {
      return this.pruneToDecisions(agentName, conversationHistory, projectState);
    }

    if (rule === 'tasks_only') {
      return this.pruneToTasks(agentName, conversationHistory, projectState);
    }

    // Handle numeric rules (last N messages)
    return this.pruneToCount(agentName, conversationHistory, rule as number);
  }

  /**
   * Prune to last N messages
   */
  private pruneToCount(
    agentName: string,
    conversationHistory: any[],
    count: number
  ): { prunedHistory: any[]; stats: PruningStats } {
    const originalCount = conversationHistory.length;
    const prunedHistory = conversationHistory.slice(-count);

    return {
      prunedHistory,
      stats: {
        originalCount,
        prunedCount: prunedHistory.length,
        tokensSaved: this.estimateTokensSaved(originalCount - prunedHistory.length),
        agentName,
      },
    };
  }

  /**
   * Prune to messages containing decisions
   * Used by ConsistencyGuardian - needs all decisions to check consistency
   */
  private pruneToDecisions(
    agentName: string,
    conversationHistory: any[],
    projectState: any
  ): { prunedHistory: any[]; stats: PruningStats } {
    const originalCount = conversationHistory.length;

    // Keep messages that recorded decisions + last 5 messages for context
    const decisionMessages = conversationHistory.filter(msg =>
      msg.metadata?.itemRecorded ||
      msg.metadata?.stateChange ||
      msg.role === 'user' // Always keep user messages
    );

    // Always include last 5 messages for recent context
    const recentMessages = conversationHistory.slice(-5);

    // Combine and deduplicate
    const prunedHistory = this.deduplicateMessages([
      ...decisionMessages,
      ...recentMessages,
    ]);

    return {
      prunedHistory,
      stats: {
        originalCount,
        prunedCount: prunedHistory.length,
        tokensSaved: this.estimateTokensSaved(originalCount - prunedHistory.length),
        agentName,
      },
    };
  }

  /**
   * Prune to messages containing tasks
   * Used by PrioritizationAgent - needs all tasks to prioritize
   */
  private pruneToTasks(
    agentName: string,
    conversationHistory: any[],
    projectState: any
  ): { prunedHistory: any[]; stats: PruningStats } {
    const originalCount = conversationHistory.length;

    // Keep messages that contain tasks or decisions + last 10 for context
    const taskMessages = conversationHistory.filter(msg =>
      msg.metadata?.itemRecorded ||
      msg.metadata?.taskIdentified ||
      msg.content?.toLowerCase().includes('task') ||
      msg.content?.toLowerCase().includes('todo') ||
      msg.role === 'user'
    );

    const recentMessages = conversationHistory.slice(-10);

    const prunedHistory = this.deduplicateMessages([
      ...taskMessages,
      ...recentMessages,
    ]);

    return {
      prunedHistory,
      stats: {
        originalCount,
        prunedCount: prunedHistory.length,
        tokensSaved: this.estimateTokensSaved(originalCount - prunedHistory.length),
        agentName,
      },
    };
  }

  /**
   * Remove duplicate messages while preserving order
   */
  private deduplicateMessages(messages: any[]): any[] {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = msg.id || `${msg.created_at}_${msg.content?.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Estimate tokens saved (rough approximation: 1 message ≈ 200 tokens)
   */
  private estimateTokensSaved(messageCount: number): number {
    return messageCount * 200;
  }

  /**
   * Log pruning statistics for monitoring
   */
  logStats(stats: PruningStats): void {
    const savingsPercent = stats.originalCount > 0
      ? Math.round(((stats.originalCount - stats.prunedCount) / stats.originalCount) * 100)
      : 0;

    console.log(
      `[ContextPruner] ${stats.agentName}: ` +
      `${stats.originalCount} → ${stats.prunedCount} messages ` +
      `(${savingsPercent}% reduction, ~${stats.tokensSaved} tokens saved)`
    );
  }

  /**
   * Get total statistics across all agents
   */
  getTotalStats(allStats: PruningStats[]): {
    totalMessages: number;
    totalPruned: number;
    totalTokensSaved: number;
    averageSavingsPercent: number;
  } {
    const totalMessages = allStats.reduce((sum, s) => sum + s.originalCount, 0);
    const totalPruned = allStats.reduce((sum, s) => sum + s.prunedCount, 0);
    const totalTokensSaved = allStats.reduce((sum, s) => sum + s.tokensSaved, 0);

    const averageSavingsPercent = totalMessages > 0
      ? Math.round(((totalMessages - totalPruned) / totalMessages) * 100)
      : 0;

    return {
      totalMessages,
      totalPruned,
      totalTokensSaved,
      averageSavingsPercent,
    };
  }
}
