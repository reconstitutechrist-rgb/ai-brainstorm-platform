import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { conversationsApi } from '../services/api';

/**
 * Custom hook to handle message loading with pagination support
 * Loads messages in batches for better performance with large conversations
 */
export const useMessageLoader = (projectId?: string) => {
  const { messages, setMessages, addMessages } = useChatStore();
  const projectIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  /**
   * Load initial messages (most recent 50)
   * Called when component mounts or project changes
   */
  const loadInitialMessages = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useMessageLoader] Loading initial messages for project:', projectId);
      const response = await conversationsApi.getMessages(projectId, 50, 0);
      
      if (response.success) {
        console.log(`[useMessageLoader] Loaded ${response.messages.length} initial messages`);
        setMessages(response.messages);
        setHasMore(response.hasMore);
        setTotal(response.total);
      }
    } catch (err) {
      console.error('[useMessageLoader] Failed to load messages:', err);
      setError('Failed to load messages');
      setMessages([]); // Clear on error
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setMessages]);

  /**
   * Load more messages (for infinite scroll)
   * Appends older messages to the beginning of the list
   */
  const loadMoreMessages = useCallback(async () => {
    if (!projectId || isLoading || !hasMore) {
      console.log('[useMessageLoader] Skipping loadMore:', { projectId, isLoading, hasMore });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offset = messages.length;
      console.log(`[useMessageLoader] Loading more messages: offset=${offset}, limit=50`);
      
      const response = await conversationsApi.getMessages(projectId, 50, offset);
      
      if (response.success) {
        console.log(`[useMessageLoader] Loaded ${response.messages.length} more messages`);
        addMessages(response.messages);
        setHasMore(response.hasMore);
        setTotal(response.total);
      }
    } catch (err) {
      console.error('[useMessageLoader] Failed to load more messages:', err);
      setError('Failed to load more messages');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, messages.length, isLoading, hasMore, addMessages]);

  /**
   * Auto-load messages when project changes
   */
  useEffect(() => {
    if (projectId) {
      const projectChanged = projectIdRef.current !== projectId;

      if (projectChanged) {
        console.log('[useMessageLoader] Project changed, loading initial messages');
        projectIdRef.current = projectId;
        setMessages([]); // Clear messages when switching projects
        setHasMore(true); // Reset pagination state
        setTotal(0);
        setError(null);
        loadInitialMessages();
      }
    }
  }, [projectId, loadInitialMessages, setMessages]);

  return { 
    loadInitialMessages, 
    loadMoreMessages,
    isLoading,
    hasMore,
    error,
    total
  };
};
