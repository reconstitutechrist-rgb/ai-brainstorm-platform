/**
 * ✅ MEDIUM PRIORITY FIX: Undo/Redo Functionality for Canvas Operations
 *
 * Provides history management for canvas operations with keyboard shortcuts.
 * Supports undo (Ctrl/Cmd+Z) and redo (Ctrl/Cmd+Shift+Z).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { HISTORY } from '../constants/canvas';

export interface CanvasAction {
  type: 'move' | 'archive' | 'restore' | 'state_change' | 'cluster' | 'batch';
  timestamp: number;
  data: {
    itemIds: string[];
    beforeState?: any;
    afterState?: any;
  };
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

interface UseCanvasHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  pushAction: (action: CanvasAction) => void;
  clear: () => void;
  historySize: number;
}

export function useCanvasHistory(): UseCanvasHistoryReturn {
  const [undoStack, setUndoStack] = useState<CanvasAction[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBatchRef = useRef<CanvasAction[]>([]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, []);

  // Push a new action to the history
  const pushAction = useCallback((action: CanvasAction) => {
    // Check if this action should be batched with recent actions
    if (shouldBatch(action, pendingBatchRef.current)) {
      pendingBatchRef.current.push(action);

      // Reset batch timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      // Commit batch after timeout
      batchTimerRef.current = setTimeout(() => {
        if (pendingBatchRef.current.length > 0) {
          const batchedAction = createBatchAction(pendingBatchRef.current);
          commitAction(batchedAction);
          pendingBatchRef.current = [];
        }
      }, HISTORY.BATCH_TIMEOUT);
    } else {
      // Commit any pending batch first
      if (pendingBatchRef.current.length > 0) {
        const batchedAction = createBatchAction(pendingBatchRef.current);
        commitAction(batchedAction);
        pendingBatchRef.current = [];
      }

      // Commit this action
      commitAction(action);
    }
  }, []);

  // Actually commit an action to the undo stack
  const commitAction = useCallback((action: CanvasAction) => {
    setUndoStack((prev) => {
      const newStack = [...prev, action];
      // Limit stack size
      if (newStack.length > HISTORY.MAX_STACK_SIZE) {
        return newStack.slice(-HISTORY.MAX_STACK_SIZE);
      }
      return newStack;
    });

    // Clear redo stack when new action is added
    setRedoStack([]);
  }, []);

  // Undo the last action
  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];

    try {
      await action.undo();

      // Move action from undo to redo stack
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, action]);
    } catch (error) {
      console.error('[CanvasHistory] Undo failed:', error);
      // Don't modify stacks if undo fails
    }
  }, [undoStack]);

  // Redo the last undone action
  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];

    try {
      await action.redo();

      // Move action from redo to undo stack
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, action]);
    } catch (error) {
      console.error('[CanvasHistory] Redo failed:', error);
      // Don't modify stacks if redo fails
    }
  }, [redoStack]);

  // Clear all history
  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    pendingBatchRef.current = [];
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'z') {
        e.preventDefault();

        if (e.shiftKey) {
          // Cmd/Ctrl+Shift+Z = Redo
          redo();
        } else {
          // Cmd/Ctrl+Z = Undo
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    pushAction,
    clear,
    historySize: undoStack.length + redoStack.length,
  };
}

/**
 * Helper: Determine if an action should be batched with pending actions
 */
function shouldBatch(action: CanvasAction, pendingBatch: CanvasAction[]): boolean {
  if (pendingBatch.length === 0) return false;

  const lastAction = pendingBatch[pendingBatch.length - 1];

  // Only batch actions of the same type
  if (action.type !== lastAction.type) return false;

  // Only batch if within time window
  const timeDiff = action.timestamp - lastAction.timestamp;
  if (timeDiff > HISTORY.BATCH_TIMEOUT) return false;

  // Only batch 'move' actions
  return action.type === 'move';
}

/**
 * Helper: Create a single batched action from multiple actions
 */
function createBatchAction(actions: CanvasAction[]): CanvasAction {
  return {
    type: 'batch',
    timestamp: actions[0].timestamp,
    data: {
      itemIds: actions.flatMap((a) => a.data.itemIds),
      beforeState: actions[0].data.beforeState,
      afterState: actions[actions.length - 1].data.afterState,
    },
    undo: async () => {
      // Undo in reverse order
      for (let i = actions.length - 1; i >= 0; i--) {
        await actions[i].undo();
      }
    },
    redo: async () => {
      // Redo in original order
      for (const action of actions) {
        await action.redo();
      }
    },
  };
}

/**
 * Helper: Create a position change action
 */
export function createMoveAction(
  itemId: string,
  fromPosition: { x: number; y: number },
  toPosition: { x: number; y: number },
  updatePosition: (id: string, pos: { x: number; y: number }) => void
): CanvasAction {
  return {
    type: 'move',
    timestamp: Date.now(),
    data: {
      itemIds: [itemId],
      beforeState: fromPosition,
      afterState: toPosition,
    },
    undo: () => {
      updatePosition(itemId, fromPosition);
    },
    redo: () => {
      updatePosition(itemId, toPosition);
    },
  };
}

/**
 * Helper: Create an archive action
 */
export function createArchiveAction(
  itemId: string,
  toggleArchive: (id: string) => Promise<void>
): CanvasAction {
  return {
    type: 'archive',
    timestamp: Date.now(),
    data: {
      itemIds: [itemId],
    },
    undo: async () => {
      await toggleArchive(itemId);
    },
    redo: async () => {
      await toggleArchive(itemId);
    },
  };
}

/**
 * Helper: Create a state change action
 */
export function createStateChangeAction(
  itemId: string,
  fromState: string,
  toState: string,
  updateState: (id: string, state: any) => Promise<void>
): CanvasAction {
  return {
    type: 'state_change',
    timestamp: Date.now(),
    data: {
      itemIds: [itemId],
      beforeState: fromState,
      afterState: toState,
    },
    undo: async () => {
      await updateState(itemId, fromState);
    },
    redo: async () => {
      await updateState(itemId, toState);
    },
  };
}
