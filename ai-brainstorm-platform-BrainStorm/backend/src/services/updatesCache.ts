/**
 * Simple in-memory cache for storing pending project updates
 * Updates are stored temporarily after background processing completes
 * and retrieved by the frontend via polling
 */

interface ProjectUpdates {
  itemsAdded: any[];
  itemsModified: any[];
  itemsMoved: any[];
  timestamp: number;
  workflow?: {
    intent: string;
    confidence: number;
  };
}

class UpdatesCache {
  private cache: Map<string, ProjectUpdates>;
  private readonly TTL_MS = 30000; // 30 seconds TTL

  constructor() {
    this.cache = new Map();

    // Cleanup expired entries every 10 seconds
    setInterval(() => this.cleanup(), 10000);
  }

  /**
   * Store updates for a project
   */
  set(projectId: string, updates: ProjectUpdates): void {
    console.log(`[UpdatesCache] Storing updates for project ${projectId}:`, {
      itemsAdded: updates.itemsAdded.length,
      itemsModified: updates.itemsModified.length,
      itemsMoved: updates.itemsMoved.length
    });

    this.cache.set(projectId, {
      ...updates,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieve and remove updates for a project
   * Returns null if no updates available
   */
  get(projectId: string): ProjectUpdates | null {
    const updates = this.cache.get(projectId);

    if (!updates) {
      console.log(`[UpdatesCache] No updates found for project ${projectId}`);
      return null;
    }

    // Check if expired
    if (Date.now() - updates.timestamp > this.TTL_MS) {
      console.log(`[UpdatesCache] Updates expired for project ${projectId}`);
      this.cache.delete(projectId);
      return null;
    }

    // Remove from cache after retrieval (one-time use)
    this.cache.delete(projectId);

    console.log(`[UpdatesCache] Retrieved updates for project ${projectId}`);
    return updates;
  }

  /**
   * Check if updates are available for a project
   */
  has(projectId: string): boolean {
    const updates = this.cache.get(projectId);
    if (!updates) return false;

    // Check if expired
    if (Date.now() - updates.timestamp > this.TTL_MS) {
      this.cache.delete(projectId);
      return false;
    }

    return true;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [projectId, updates] of this.cache.entries()) {
      if (now - updates.timestamp > this.TTL_MS) {
        this.cache.delete(projectId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[UpdatesCache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Clear all cached updates
   */
  clear(): void {
    this.cache.clear();
    console.log('[UpdatesCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; projects: string[] } {
    return {
      size: this.cache.size,
      projects: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const updatesCache = new UpdatesCache();
