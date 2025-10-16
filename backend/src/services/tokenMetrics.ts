/**
 * TokenMetrics - Track token usage and cost optimization
 *
 * Monitors token consumption across agents to identify optimization opportunities.
 * All estimates are approximations based on typical token counts.
 */

interface TokenUsageRecord {
  agentName: string;
  timestamp: number;
  estimatedTokens: number;
  wasCached: boolean;
  messageLengthChars: number;
  historyLengthMessages: number;
}

interface AgentTokenStats {
  agentName: string;
  totalCalls: number;
  cachedCalls: number;
  estimatedTokens: number;
  tokensSaved: number; // From caching
  averageTokensPerCall: number;
}

export class TokenMetrics {
  private usageRecords: TokenUsageRecord[] = [];
  private readonly MAX_RECORDS = 1000; // Keep last 1000 records

  /**
   * Record token usage for an agent call
   */
  recordUsage(
    agentName: string,
    userMessage: string,
    conversationHistory: any[],
    systemPromptLength: number,
    wasCached: boolean
  ): void {
    // Estimate tokens (very rough approximation)
    // System prompt: ~1 token per 4 characters
    // User message: ~1 token per 4 characters
    // History: ~1 token per 4 characters
    const systemTokens = Math.ceil(systemPromptLength / 4);
    const messageTokens = Math.ceil(userMessage.length / 4);

    // History tokens (sum of all message content)
    const historyChars = conversationHistory.reduce(
      (sum, msg) => sum + (msg.content?.length || 0),
      0
    );
    const historyTokens = Math.ceil(historyChars / 4);

    // Total input tokens
    const estimatedTokens = systemTokens + messageTokens + historyTokens;

    this.usageRecords.push({
      agentName,
      timestamp: Date.now(),
      estimatedTokens: wasCached ? 0 : estimatedTokens, // No tokens if cached
      wasCached,
      messageLengthChars: userMessage.length,
      historyLengthMessages: conversationHistory.length,
    });

    // Limit records
    if (this.usageRecords.length > this.MAX_RECORDS) {
      this.usageRecords = this.usageRecords.slice(-this.MAX_RECORDS);
    }
  }

  /**
   * Get token statistics per agent
   */
  getAgentStats(): AgentTokenStats[] {
    const agentMap = new Map<string, AgentTokenStats>();

    for (const record of this.usageRecords) {
      if (!agentMap.has(record.agentName)) {
        agentMap.set(record.agentName, {
          agentName: record.agentName,
          totalCalls: 0,
          cachedCalls: 0,
          estimatedTokens: 0,
          tokensSaved: 0,
          averageTokensPerCall: 0,
        });
      }

      const stats = agentMap.get(record.agentName)!;
      stats.totalCalls++;

      if (record.wasCached) {
        stats.cachedCalls++;
        // If cached, tokens weren't used (but we estimate what would have been used)
        stats.tokensSaved += record.estimatedTokens;
      } else {
        stats.estimatedTokens += record.estimatedTokens;
      }
    }

    // Calculate averages
    for (const stats of agentMap.values()) {
      if (stats.totalCalls > 0) {
        const uncachedCalls = stats.totalCalls - stats.cachedCalls;
        stats.averageTokensPerCall =
          uncachedCalls > 0
            ? Math.round(stats.estimatedTokens / uncachedCalls)
            : 0;
      }
    }

    // Sort by total tokens (highest first)
    return Array.from(agentMap.values()).sort(
      (a, b) => b.estimatedTokens - a.estimatedTokens
    );
  }

  /**
   * Get overall token statistics
   */
  getTotalStats(): {
    totalCalls: number;
    cachedCalls: number;
    cacheHitRate: number;
    estimatedTokensUsed: number;
    estimatedTokensSaved: number;
    totalSavingsPercent: number;
    estimatedCostUSD: number;
    estimatedSavingsUSD: number;
  } {
    let totalCalls = 0;
    let cachedCalls = 0;
    let tokensUsed = 0;
    let tokensSaved = 0;

    for (const record of this.usageRecords) {
      totalCalls++;
      if (record.wasCached) {
        cachedCalls++;
        tokensSaved += record.estimatedTokens;
      } else {
        tokensUsed += record.estimatedTokens;
      }
    }

    const cacheHitRate =
      totalCalls > 0 ? (cachedCalls / totalCalls) * 100 : 0;

    const totalPotentialTokens = tokensUsed + tokensSaved;
    const totalSavingsPercent =
      totalPotentialTokens > 0
        ? (tokensSaved / totalPotentialTokens) * 100
        : 0;

    // Cost estimation (Claude Sonnet 4 pricing)
    // Input: $3 per 1M tokens
    // These are rough estimates based on input tokens only
    const costPerMillion = 3.0;
    const estimatedCostUSD = (tokensUsed / 1_000_000) * costPerMillion;
    const estimatedSavingsUSD = (tokensSaved / 1_000_000) * costPerMillion;

    return {
      totalCalls,
      cachedCalls,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      estimatedTokensUsed: tokensUsed,
      estimatedTokensSaved: tokensSaved,
      totalSavingsPercent: Math.round(totalSavingsPercent * 10) / 10,
      estimatedCostUSD: Math.round(estimatedCostUSD * 100) / 100,
      estimatedSavingsUSD: Math.round(estimatedSavingsUSD * 100) / 100,
    };
  }

  /**
   * Log comprehensive token metrics
   */
  logMetrics(): void {
    const totalStats = this.getTotalStats();
    const agentStats = this.getAgentStats().slice(0, 10); // Top 10

    console.log('\n=== Token Usage Metrics ===');
    console.log(
      `Total API calls: ${totalStats.totalCalls} (${totalStats.cachedCalls} cached, ${totalStats.cacheHitRate}% hit rate)`
    );
    console.log(
      `Tokens used: ~${totalStats.estimatedTokensUsed.toLocaleString()} (~$${totalStats.estimatedCostUSD})`
    );
    console.log(
      `Tokens saved: ~${totalStats.estimatedTokensSaved.toLocaleString()} (~$${totalStats.estimatedSavingsUSD}) [${totalStats.totalSavingsPercent}% reduction]`
    );

    if (agentStats.length > 0) {
      console.log('\nTop agents by token usage:');
      agentStats.forEach((stats, index) => {
        const cacheRate =
          stats.totalCalls > 0
            ? Math.round((stats.cachedCalls / stats.totalCalls) * 100)
            : 0;
        console.log(
          `  ${index + 1}. ${stats.agentName}: ` +
            `~${stats.estimatedTokens.toLocaleString()} tokens ` +
            `(${stats.totalCalls} calls, ${cacheRate}% cached, ` +
            `avg ${stats.averageTokensPerCall} tokens/call)`
        );
      });
    }

    console.log('===========================\n');
  }

  /**
   * Get metrics for API response
   */
  getMetricsForAPI() {
    return {
      total: this.getTotalStats(),
      byAgent: this.getAgentStats(),
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.usageRecords = [];
  }

  /**
   * Get time-based statistics (e.g., last hour, last day)
   */
  getStatsForTimeRange(minutesAgo: number): {
    totalCalls: number;
    cachedCalls: number;
    estimatedTokens: number;
  } {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    const recentRecords = this.usageRecords.filter(
      (r) => r.timestamp >= cutoffTime
    );

    let totalCalls = 0;
    let cachedCalls = 0;
    let tokens = 0;

    for (const record of recentRecords) {
      totalCalls++;
      if (record.wasCached) {
        cachedCalls++;
      } else {
        tokens += record.estimatedTokens;
      }
    }

    return {
      totalCalls,
      cachedCalls,
      estimatedTokens: tokens,
    };
  }
}
