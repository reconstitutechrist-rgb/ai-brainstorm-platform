import crypto from 'crypto';
import { AgentResponse } from '../types';

/**
 * ResponseCache - Cache AI agent responses to reduce duplicate API calls
 *
 * Key principle: Cache responses for similar requests to avoid redundant Claude API calls.
 * This is safe because:
 * - Responses are invalidated when project state changes
 * - TTL ensures responses stay fresh (5-10 minutes)
 * - Cache keys include agent + message + state hash
 */

interface CacheEntry {
  response: AgentResponse;
  timestamp: number;
  ttl: number; // milliseconds
  agentName: string;
  messageHash: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
  };

  // Agent-specific TTL configuration (in milliseconds)
  private readonly TTL_CONFIG: Record<string, number> = {
    // Verification agents - short TTL (validation may change)
    'verification': 2 * 60 * 1000,          // 2 minutes
    'assumptionBlocker': 2 * 60 * 1000,     // 2 minutes

    // Content generation - medium TTL
    'brainstorming': 5 * 60 * 1000,         // 5 minutes
    'questioner': 5 * 60 * 1000,            // 5 minutes
    'clarification': 5 * 60 * 1000,         // 5 minutes

    // Analysis agents - longer TTL (analysis is more stable)
    'gapDetection': 10 * 60 * 1000,         // 10 minutes
    'consistencyGuardian': 8 * 60 * 1000,   // 8 minutes
    'accuracyAuditor': 8 * 60 * 1000,       // 8 minutes

    // Strategic agents - no caching (always fresh)
    'recorder': 0,                          // Never cache
    'versionControl': 0,                    // Never cache
    'reviewer': 0,                          // Never cache

    // Default TTL
    'default': 5 * 60 * 1000,               // 5 minutes
  };

  /**
   * Generate cache key from agent name, message, and project state
   */
  generateKey(
    agentName: string,
    userMessage: string,
    projectState: any,
    conversationHistory: any[]
  ): string {
    // Hash the relevant inputs
    const messageHash = this.hashString(userMessage);
    const stateHash = this.hashState(projectState);

    // For some agents, include recent conversation in the key
    const includeHistory = ['brainstorming', 'questioner', 'clarification'];
    let historyHash = '';

    if (includeHistory.includes(agentName) && conversationHistory.length > 0) {
      // Only hash last 3 messages for cache key
      const recentMessages = conversationHistory.slice(-3);
      historyHash = this.hashString(JSON.stringify(recentMessages));
    }

    return `${agentName}:${messageHash}:${stateHash}:${historyHash}`;
  }

  /**
   * Get cached response if available and not expired
   */
  get(key: string): AgentResponse | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.currentSize = this.cache.size;
      console.log(`[ResponseCache] Evicted expired entry for ${entry.agentName} (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    this.stats.hits++;
    console.log(`[ResponseCache] HIT for ${entry.agentName} (age: ${Math.round(age / 1000)}s, TTL: ${entry.ttl / 1000}s)`);

    return entry.response;
  }

  /**
   * Store response in cache with agent-specific TTL
   */
  set(
    key: string,
    agentName: string,
    response: AgentResponse,
    userMessage: string
  ): void {
    const ttl = this.TTL_CONFIG[agentName] || this.TTL_CONFIG.default;

    // Don't cache if TTL is 0 (agents that should never be cached)
    if (ttl === 0) {
      console.log(`[ResponseCache] Skipping cache for ${agentName} (caching disabled)`);
      return;
    }

    const messageHash = this.hashString(userMessage).substring(0, 8);

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl,
      agentName,
      messageHash,
    });

    this.stats.currentSize = this.cache.size;

    console.log(`[ResponseCache] Cached response for ${agentName} (TTL: ${ttl / 1000}s, key: ...${messageHash})`);

    // Cleanup old entries if cache is getting large
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  /**
   * Invalidate all cache entries for a specific agent
   */
  invalidateAgent(agentName: string): void {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.agentName === agentName) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.stats.evictions += count;
      this.stats.currentSize = this.cache.size;
      console.log(`[ResponseCache] Invalidated ${count} entries for ${agentName}`);
    }
  }

  /**
   * Invalidate all cache entries (e.g., when project state changes significantly)
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.evictions += size;
    this.stats.currentSize = 0;
    console.log(`[ResponseCache] Invalidated all ${size} entries`);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.stats.currentSize = this.cache.size;
      console.log(`[ResponseCache] Cleanup: evicted ${evicted} expired entries`);
    }
  }

  /**
   * Hash a string using SHA256
   */
  private hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Hash project state (only relevant fields)
   */
  private hashState(projectState: any): string {
    // Only hash the parts of state that affect agent responses
    const relevantState = {
      decidedCount: projectState.decided?.length || 0,
      exploringCount: projectState.exploring?.length || 0,
      parkedCount: projectState.parked?.length || 0,
      // Hash last few items for consistency checks
      recentDecisions: projectState.decided?.slice(-3).map((item: any) => item.text) || [],
    };

    return this.hashString(JSON.stringify(relevantState));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    hitRate: number;
    estimatedSavings: number; // Estimated API calls saved
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 10) / 10, // Round to 1 decimal
      estimatedSavings: this.stats.hits, // Each hit = 1 API call saved
    };
  }

  /**
   * Log cache statistics (call periodically for monitoring)
   */
  logStats(): void {
    const stats = this.getStats();

    console.log(
      `[ResponseCache] Stats: ${stats.hits} hits, ${stats.misses} misses ` +
      `(${stats.hitRate}% hit rate), ${stats.currentSize} entries, ` +
      `~${stats.estimatedSavings} API calls saved`
    );
  }

  /**
   * Reset statistics (for testing)
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: this.cache.size,
    };
  }
}
