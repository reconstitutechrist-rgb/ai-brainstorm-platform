/**
 * ✅ MEDIUM PRIORITY FIX: Persist Canvas Selection State
 *
 * Saves and restores selected card IDs to localStorage.
 * Maintains selection across page refreshes and sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import { SELECTION } from '../constants/canvas';

interface UsePersistedSelectionOptions {
  projectId: string;
  enabled?: boolean;
}

interface UsePersistedSelectionReturn {
  selectedIds: Set<string>;
  toggleSelection: (itemId: string) => void;
  selectAll: (itemIds: string[]) => void;
  clearSelection: () => void;
  hasSelection: boolean;
  selectionCount: number;
}

/**
 * Hook to persist canvas selection state in localStorage
 */
export function usePersistedSelection({
  projectId,
  enabled = true,
}: UsePersistedSelectionOptions): UsePersistedSelectionReturn {
  const storageKey = `${SELECTION.STORAGE_KEY}_${projectId}`;

  // Initialize selection from localStorage
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (!enabled) return new Set();

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (error) {
      console.warn('[usePersistedSelection] Failed to load selection:', error);
    }

    return new Set();
  });

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    if (!enabled) return;

    try {
      const array = Array.from(selectedIds);
      localStorage.setItem(storageKey, JSON.stringify(array));
    } catch (error) {
      console.warn('[usePersistedSelection] Failed to save selection:', error);
    }
  }, [selectedIds, storageKey, enabled]);

  // Toggle a single item
  const toggleSelection = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        // Enforce max selection limit
        if (next.size >= SELECTION.MAX_SELECTED) {
          console.warn(
            `[usePersistedSelection] Max selection limit (${SELECTION.MAX_SELECTED}) reached`
          );
          return prev;
        }
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Select all items
  const selectAll = useCallback((itemIds: string[]) => {
    const limitedIds = itemIds.slice(0, SELECTION.MAX_SELECTED);
    if (itemIds.length > SELECTION.MAX_SELECTED) {
      console.warn(
        `[usePersistedSelection] Selecting first ${SELECTION.MAX_SELECTED} of ${itemIds.length} items`
      );
    }
    setSelectedIds(new Set(limitedIds));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Helper values
  const hasSelection = selectedIds.size > 0;
  const selectionCount = selectedIds.size;

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    hasSelection,
    selectionCount,
  };
}

/**
 * Helper: Clean up orphaned selections (items that no longer exist)
 */
export function cleanupOrphanedSelections(
  selectedIds: Set<string>,
  existingItemIds: string[]
): Set<string> {
  const existingSet = new Set(existingItemIds);
  const cleaned = new Set<string>();

  selectedIds.forEach((id) => {
    if (existingSet.has(id)) {
      cleaned.add(id);
    }
  });

  return cleaned;
}

/**
 * Helper: Clear all persisted selections (useful for cleanup/logout)
 */
export function clearAllPersistedSelections(): void {
  try {
    const keys = Object.keys(localStorage);
    const selectionKeys = keys.filter((key) =>
      key.startsWith(SELECTION.STORAGE_KEY)
    );

    selectionKeys.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.info(
      `[usePersistedSelection] Cleared ${selectionKeys.length} persisted selections`
    );
  } catch (error) {
    console.warn('[usePersistedSelection] Failed to clear selections:', error);
  }
}
