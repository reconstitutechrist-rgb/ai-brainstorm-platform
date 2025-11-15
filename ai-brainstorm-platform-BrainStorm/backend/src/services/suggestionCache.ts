import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface CachedSuggestions {
  suggestions: any[];
  generatedAt: Date;
  expiresAt: Date;
  isStale?: boolean;
}

export interface ProjectContext {
  messageCount: number;
  decidedCount: number;
  exploringCount: number;
  parkedCount: number;
  recentActivity?: string;
}

export class SuggestionCacheService {
  private supabase: SupabaseClient;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Generate a hash of the project context to use as cache key
   */
  private generateContextHash(projectId: string, context: ProjectContext): string {
    const contextString = JSON.stringify({
      projectId,
      messageCount: Math.floor(context.messageCount / 5) * 5, // Round to nearest 5
      decidedCount: context.decidedCount,
      exploringCount: context.exploringCount,
      parkedCount: context.parkedCount,
    });
    
    return crypto.createHash('md5').update(contextString).digest('hex');
  }

  /**
   * Check if context has changed significantly enough to invalidate cache
   */
  shouldRegenerateSuggestions(
    oldContext: ProjectContext,
    newContext: ProjectContext
  ): boolean {
    // Regenerate if items changed
    if (
      oldContext.decidedCount !== newContext.decidedCount ||
      oldContext.exploringCount !== newContext.exploringCount ||
      oldContext.parkedCount !== newContext.parkedCount
    ) {
      return true;
    }

    // Regenerate if 5+ new messages
    if (newContext.messageCount - oldContext.messageCount >= 5) {
      return true;
    }

    return false;
  }

  /**
   * Get cached suggestions if valid (or stale if allowStale=true)
   */
  async getCachedSuggestions(
    projectId: string,
    context: ProjectContext,
    allowStale: boolean = false
  ): Promise<CachedSuggestions | null> {
    try {
      const contextHash = this.generateContextHash(projectId, context);
      
      // First try to get non-expired cache
      const { data: freshData, error: freshError } = await this.supabase
        .from('suggestion_cache')
        .select('*')
        .eq('project_id', projectId)
        .eq('context_hash', contextHash)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (!freshError && freshData) {
        return {
          suggestions: freshData.suggestions,
          generatedAt: new Date(freshData.generated_at),
          expiresAt: new Date(freshData.expires_at),
          isStale: false,
        };
      }

      // If allowStale, try to get expired cache
      if (allowStale) {
        const { data: staleData, error: staleError } = await this.supabase
          .from('suggestion_cache')
          .select('*')
          .eq('project_id', projectId)
          .eq('context_hash', contextHash)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();

        if (!staleError && staleData) {
          console.log('[SuggestionCache] Returning stale cache while revalidating');
          return {
            suggestions: staleData.suggestions,
            generatedAt: new Date(staleData.generated_at),
            expiresAt: new Date(staleData.expires_at),
            isStale: true,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[SuggestionCache] Error fetching cache:', error);
      return null;
    }
  }

  /**
   * Store suggestions in cache
   */
  async cacheSuggestions(
    projectId: string,
    context: ProjectContext,
    suggestions: any[],
    ttl?: number
  ): Promise<void> {
    try {
      const contextHash = this.generateContextHash(projectId, context);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL));

      const { error } = await this.supabase
        .from('suggestion_cache')
        .upsert({
          project_id: projectId,
          context_hash: contextHash,
          suggestions: suggestions,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          message_count: context.messageCount,
          decided_count: context.decidedCount,
          exploring_count: context.exploringCount,
          parked_count: context.parkedCount,
        }, {
          onConflict: 'project_id,context_hash'
        });

      if (error) {
        console.error('[SuggestionCache] Error caching suggestions:', error);
      }
    } catch (error) {
      console.error('[SuggestionCache] Error caching suggestions:', error);
    }
  }

  /**
   * Invalidate cache for a project
   */
  async invalidateCache(projectId: string): Promise<void> {
    try {
      await this.supabase
        .from('suggestion_cache')
        .delete()
        .eq('project_id', projectId);
    } catch (error) {
      console.error('[SuggestionCache] Error invalidating cache:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      await this.supabase.rpc('cleanup_expired_suggestion_cache');
    } catch (error) {
      console.error('[SuggestionCache] Error cleaning up cache:', error);
    }
  }

  /**
   * Get cache statistics for a project
   */
  async getCacheStats(projectId: string): Promise<{
    totalCached: number;
    latestContext: ProjectContext | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('suggestion_cache')
        .select('*')
        .eq('project_id', projectId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { totalCached: 0, latestContext: null };
      }

      return {
        totalCached: 1,
        latestContext: {
          messageCount: data.message_count,
          decidedCount: data.decided_count,
          exploringCount: data.exploring_count,
          parkedCount: data.parked_count,
        },
      };
    } catch (error) {
      return { totalCached: 0, latestContext: null };
    }
  }
}
