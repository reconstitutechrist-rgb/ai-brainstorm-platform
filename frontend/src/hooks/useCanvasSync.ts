import { useEffect, useMemo } from 'react';
import type { ProjectItem } from '../types';

interface UseCanvasSyncProps {
  projectItems: ProjectItem[];
  onAutoPosition?: (itemId: string) => void;
}

/**
 * Hook to manage canvas synchronization with project items
 * Monitors for new items and triggers auto-positioning
 */
export const useCanvasSync = ({ projectItems, onAutoPosition }: UseCanvasSyncProps) => {
  // Get active canvas items (decided + exploring, non-archived)
  const activeItems = useMemo(() => {
    return projectItems.filter(
      item => (item.state === 'decided' || item.state === 'exploring') && !item.isArchived
    );
  }, [projectItems]);

  // Get items that need positioning
  const itemsNeedingPosition = useMemo(() => {
    return activeItems.filter(item => !item.position);
  }, [activeItems]);

  // Auto-position items that don't have a position
  useEffect(() => {
    if (itemsNeedingPosition.length > 0 && onAutoPosition) {
      itemsNeedingPosition.forEach(item => {
        onAutoPosition(item.id);
      });
    }
  }, [itemsNeedingPosition, onAutoPosition]);

  return {
    activeItems,
    itemsNeedingPosition,
  };
};

/**
 * Calculate auto-layout position for a new card
 */
export const calculateAutoPosition = (
  _existingCards: ProjectItem[],
  index: number
): { x: number; y: number } => {
  // Grid layout: 3 columns, spacing for glass cards
  const COLS = 3;
  const SPACING_X = 280; // Width of card + gap
  const SPACING_Y = 220; // Height of card + gap
  const PADDING_X = 20;
  const PADDING_Y = 80; // Extra padding for CardCounter

  const col = index % COLS;
  const row = Math.floor(index / COLS);

  return {
    x: PADDING_X + col * SPACING_X,
    y: PADDING_Y + row * SPACING_Y,
  };
};
