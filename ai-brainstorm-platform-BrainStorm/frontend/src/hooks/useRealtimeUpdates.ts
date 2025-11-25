import { useEffect, useRef } from 'react';
import { SSEWorkerManager } from '../services/sseWorkerManager';
import { useProjectStore } from '../store/projectStore';
import type { ProjectItem } from '../types';

// Event data interfaces for type safety
interface ItemEventData {
  id?: string;
  items?: ProjectItem[];
}

interface ItemMovedEventData {
  id: string;
  position: { x: number; y: number };
}

interface SuggestionsEventData {
  count: number;
  suggestions?: Array<{ agentType: string; text: string }>;
}

interface WorkflowEventData {
  intent: string;
  confidence: number;
}

interface ReconnectingEventData {
  attempt: number;
}

interface ErrorEventData {
  message: string;
}

/**
 * Hook to connect to real-time SSE updates for a project
 * Uses SharedWorker for efficient multi-tab support
 * 
 * @param projectId - The project to subscribe to updates for
 * @param _userId - Reserved for future authentication/filtering (currently unused)
 */
export const useRealtimeUpdates = (projectId?: string, _userId?: string) => {
  const isConnected = useRef(false);
  const { addItems, updateItems } = useProjectStore();

  useEffect(() => {
    // Skip if no project ID or SharedWorker not supported
    if (!projectId) {
      console.log('[useRealtimeUpdates] No project ID, skipping connection');
      return;
    }

    if (!SSEWorkerManager.isSupported()) {
      console.warn('[useRealtimeUpdates] SharedWorker not supported, falling back to polling');
      return;
    }

    // Avoid duplicate connections
    if (isConnected.current) {
      return;
    }

    console.log('[useRealtimeUpdates] Connecting to SSE for project:', projectId);
    isConnected.current = true;

    // Connect to SSE via SharedWorker
    SSEWorkerManager.connect(projectId);

    // Event handlers with proper typing
    const handleItemAdded = (data: ItemEventData | null) => {
      console.log('[useRealtimeUpdates] Item added:', data);
      if (data && Array.isArray(data.items)) {
        addItems(data.items);
      } else if (data && data.id) {
        addItems([data as ProjectItem]);
      }
    };

    const handleItemModified = (data: ItemEventData | null) => {
      console.log('[useRealtimeUpdates] Item modified:', data);
      if (data && Array.isArray(data.items)) {
        updateItems(data.items);
      } else if (data && data.id) {
        updateItems([data as ProjectItem]);
      }
    };

    const handleItemMoved = (data: ItemMovedEventData | null) => {
      console.log('[useRealtimeUpdates] Item moved:', data);
      if (data && data.id && data.position) {
        updateItems([{ id: data.id, position: data.position } as ProjectItem]);
      }
    };

    const handleSuggestionsUpdated = (data: SuggestionsEventData | null) => {
      console.log('[useRealtimeUpdates] Suggestions updated:', data);
      // Suggestions are handled by the SuggestionsSidePanel component
      // This event is primarily for debugging/logging
    };

    const handleWorkflowComplete = (data: WorkflowEventData | null) => {
      console.log('[useRealtimeUpdates] Workflow complete:', data);
      // Could trigger a full refresh or notify user
    };

    const handleConnected = () => {
      console.log('[useRealtimeUpdates] Connected to SSE');
    };

    const handleDisconnected = () => {
      console.log('[useRealtimeUpdates] Disconnected from SSE');
    };

    const handleReconnecting = (data: ReconnectingEventData | null) => {
      console.log('[useRealtimeUpdates] Reconnecting, attempt:', data?.attempt);
    };

    const handleError = (data: ErrorEventData | null) => {
      console.error('[useRealtimeUpdates] SSE error:', data?.message);
    };

    // Subscribe to events
    SSEWorkerManager.on('item_added', handleItemAdded);
    SSEWorkerManager.on('item_modified', handleItemModified);
    SSEWorkerManager.on('item_moved', handleItemMoved);
    SSEWorkerManager.on('suggestions_updated', handleSuggestionsUpdated);
    SSEWorkerManager.on('workflow_complete', handleWorkflowComplete);
    SSEWorkerManager.on('connected', handleConnected);
    SSEWorkerManager.on('disconnected', handleDisconnected);
    SSEWorkerManager.on('reconnecting', handleReconnecting);
    SSEWorkerManager.on('error', handleError);

    // Cleanup on unmount
    return () => {
      console.log('[useRealtimeUpdates] Cleaning up SSE connection');
      isConnected.current = false;

      SSEWorkerManager.off('item_added', handleItemAdded);
      SSEWorkerManager.off('item_modified', handleItemModified);
      SSEWorkerManager.off('item_moved', handleItemMoved);
      SSEWorkerManager.off('suggestions_updated', handleSuggestionsUpdated);
      SSEWorkerManager.off('workflow_complete', handleWorkflowComplete);
      SSEWorkerManager.off('connected', handleConnected);
      SSEWorkerManager.off('disconnected', handleDisconnected);
      SSEWorkerManager.off('reconnecting', handleReconnecting);
      SSEWorkerManager.off('error', handleError);

      SSEWorkerManager.disconnect();
    };
  }, [projectId, addItems, updateItems]);

  return {
    isSupported: SSEWorkerManager.isSupported(),
    getState: () => SSEWorkerManager.getState(),
  };
};
