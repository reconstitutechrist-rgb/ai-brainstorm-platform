/**
 * ✅ MEDIUM PRIORITY FIX: Canvas Virtualization for Large Item Sets
 *
 * Only renders items visible in the viewport plus a small buffer.
 * Dramatically improves performance when canvas has 50+ items.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ProjectItem } from '../types';
import { VIRTUALIZATION, CARD_DIMENSIONS } from '../constants/canvas';

interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface UseCanvasVirtualizationOptions {
  items: ProjectItem[];
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface UseCanvasVirtualizationReturn {
  visibleItems: ProjectItem[];
  isVirtualized: boolean;
  stats: {
    total: number;
    visible: number;
    hidden: number;
  };
}

export function useCanvasVirtualization({
  items,
  containerRef,
  enabled = true,
}: UseCanvasVirtualizationOptions): UseCanvasVirtualizationReturn {
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds>({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if virtualization should be active
  const isVirtualized = useMemo(() => {
    return enabled && items.length > VIRTUALIZATION.ENABLED_THRESHOLD;
  }, [enabled, items.length]);

  // Update viewport bounds on scroll
  const updateViewportBounds = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Add buffer zone around viewport
    const bufferX = CARD_DIMENSIONS.WIDTH * VIRTUALIZATION.BUFFER_SIZE;
    const bufferY = CARD_DIMENSIONS.APPROXIMATE_HEIGHT * VIRTUALIZATION.BUFFER_SIZE;

    setViewportBounds({
      left: container.scrollLeft - bufferX,
      top: container.scrollTop - bufferY,
      right: container.scrollLeft + rect.width + bufferX,
      bottom: container.scrollTop + rect.height + bufferY,
    });
  }, [containerRef]);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (!isVirtualized) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce viewport update
    scrollTimeoutRef.current = setTimeout(() => {
      updateViewportBounds();
    }, VIRTUALIZATION.SCROLL_DEBOUNCE);
  }, [isVirtualized, updateViewportBounds]);

  // Setup scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVirtualized) return;

    // Initial bounds calculation
    updateViewportBounds();

    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef, isVirtualized, handleScroll, updateViewportBounds]);

  // Update bounds on window resize
  useEffect(() => {
    if (!isVirtualized) return;

    const handleResize = () => {
      updateViewportBounds();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVirtualized, updateViewportBounds]);

  // Filter visible items
  const visibleItems = useMemo(() => {
    if (!isVirtualized) {
      return items;
    }

    return items.filter((item) => {
      // Items without position are always visible (they'll be auto-positioned)
      if (!item.position) return true;

      const { x, y } = item.position;

      // Check if item's bounds intersect with viewport
      const itemLeft = x;
      const itemTop = y;
      const itemRight = x + CARD_DIMENSIONS.WIDTH;
      const itemBottom = y + CARD_DIMENSIONS.APPROXIMATE_HEIGHT;

      return !(
        itemRight < viewportBounds.left ||
        itemLeft > viewportBounds.right ||
        itemBottom < viewportBounds.top ||
        itemTop > viewportBounds.bottom
      );
    });
  }, [isVirtualized, items, viewportBounds]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: items.length,
      visible: visibleItems.length,
      hidden: items.length - visibleItems.length,
    }),
    [items.length, visibleItems.length]
  );

  return {
    visibleItems,
    isVirtualized,
    stats,
  };
}
