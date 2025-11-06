import NodeCache from 'node-cache';

/**
 * Centralized caching service for the Research Hub
 * Uses in-memory caching with configurable TTL
 */
export class CacheService {
  private cache: NodeCache;
  private enabled: boolean;

  constructor(options?: { stdTTL?: number; checkperiod?: number; enabled?: boolean }) {
    this.enabled = options?.enabled !== false; // Enabled by default
    
    this.cache = new NodeCache({
      stdTTL: options?.stdTTL || 3600, // Default: 1 hour
      checkperiod: options?.checkperiod || 600, // Check for expired keys every 10 minutes
      useClones: false, // Don't clone objects (better performance)
    });

    console.log(`[CacheService] Initialized (enabled: ${this.enabled}, TTL: ${options?.stdTTL || 3600}s)`);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      console.log(`[CacheService] HIT: ${key}`);
    } else {
      console.log(`[CacheService] MISS: ${key}`);
    }
    return value;
  }

  /**
   * Set a value in cache with optional TTL override
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled) return false;

    const success = this.cache.set(key, value, ttl || 0);
    console.log(`[CacheService] SET: ${key} (TTL: ${ttl || 'default'}s)`);
    return success;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): number {
    const deleted = this.cache.del(key);
    console.log(`[CacheService] DELETE: ${key} (deleted: ${deleted})`);
    return deleted;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const keys = this.cache.keys().filter(key => key.includes(pattern));
    const deleted = this.cache.del(keys);
    console.log(`[CacheService] DELETE_PATTERN: ${pattern} (deleted: ${deleted} keys)`);
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
    console.log('[CacheService] CLEAR: All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = this.cache.getStats();
    const keys = this.cache.keys().length;
    return {
      keys,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize,
    };
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[CacheService] ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}

// Singleton instance
export const cacheService = new CacheService({
  stdTTL: 3600, // 1 hour default
  checkperiod: 600, // Check every 10 minutes
  enabled: process.env.NODE_ENV !== 'test', // Disable in tests
});

// Cache key builders for consistency
export const CacheKeys = {
  // Search results cache
  search: (query: string, maxResults: number) => 
    `search:${query.toLowerCase().trim()}:${maxResults}`,
  
  // Analysis cache
  analysis: (referenceId: string) => 
    `analysis:${referenceId}`,
  
  // Synthesis cache
  synthesis: (referenceIds: string[]) => 
    `synthesis:${referenceIds.sort().join(':')}`,
  
  // Project data cache
  projectData: (projectId: string) => 
    `project:${projectId}`,
  
  // Conversational intelligence cache
  conversation: (projectId: string, message: string) => 
    `conversation:${projectId}:${message.substring(0, 50)}`,
  
  // Intelligence search cache
  intelligenceSearch: (projectId: string, query: string) => 
    `intel:${projectId}:${query.toLowerCase().trim()}`,
};
