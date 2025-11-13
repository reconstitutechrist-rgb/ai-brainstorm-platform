import express, { Request, Response } from 'express';
import { cacheService } from '../services/cacheService';

const router = express.Router();

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = cacheService.getStats();
    const enabled = cacheService.isEnabled();

    res.json({
      enabled,
      stats,
    });
  } catch (error: any) {
    console.error('[Cache API] Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/cache/clear
 * Clear all cache
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    cacheService.clear();
    
    res.json({
      message: 'Cache cleared successfully',
    });
  } catch (error: any) {
    console.error('[Cache API] Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/cache/invalidate/:pattern
 * Invalidate cache entries matching a pattern
 */
router.delete('/invalidate/:pattern', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.params;
    
    if (!pattern) {
      return res.status(400).json({
        error: 'Pattern is required',
      });
    }

    const deleted = cacheService.deletePattern(pattern);
    
    res.json({
      message: `Invalidated ${deleted} cache entries`,
      pattern,
      deleted,
    });
  } catch (error: any) {
    console.error('[Cache API] Error invalidating cache:', error);
    res.status(500).json({
      error: 'Failed to invalidate cache',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/cache/key/:key
 * Delete a specific cache key
 */
router.delete('/key/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        error: 'Key is required',
      });
    }

    const deleted = cacheService.delete(key);
    
    res.json({
      message: deleted > 0 ? 'Cache key deleted' : 'Cache key not found',
      key,
      deleted: deleted > 0,
    });
  } catch (error: any) {
    console.error('[Cache API] Error deleting cache key:', error);
    res.status(500).json({
      error: 'Failed to delete cache key',
      details: error.message,
    });
  }
});

/**
 * POST /api/cache/enable
 * Enable cache
 */
router.post('/enable', async (req: Request, res: Response) => {
  try {
    cacheService.setEnabled(true);
    
    res.json({
      message: 'Cache enabled',
      enabled: true,
    });
  } catch (error: any) {
    console.error('[Cache API] Error enabling cache:', error);
    res.status(500).json({
      error: 'Failed to enable cache',
      details: error.message,
    });
  }
});

/**
 * POST /api/cache/disable
 * Disable cache
 */
router.post('/disable', async (req: Request, res: Response) => {
  try {
    cacheService.setEnabled(false);
    
    res.json({
      message: 'Cache disabled',
      enabled: false,
    });
  } catch (error: any) {
    console.error('[Cache API] Error disabling cache:', error);
    res.status(500).json({
      error: 'Failed to disable cache',
      details: error.message,
    });
  }
});

export default router;
