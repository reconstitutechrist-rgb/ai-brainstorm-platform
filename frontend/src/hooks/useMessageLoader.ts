import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { conversationsApi } from '../services/api';

/**
 * Custom hook to handle message loading with project change detection
 * Prevents duplicate loads and clears messages when switching projects
 */
export const useMessageLoader = (projectId?: string) => {
  const { setMessages } = useChatStore();
  const projectIdRef = useRef<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await conversationsApi.getMessages(projectId);
      if (response.success) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [projectId, setMessages]);

  useEffect(() => {
    if (projectId) {
      // Check if project actually changed
      const projectChanged = projectIdRef.current !== projectId;

      if (projectChanged) {
        projectIdRef.current = projectId;
        setMessages([]); // Clear messages when switching projects
        loadMessages();
      }
    }
  }, [projectId, loadMessages, setMessages]);

  return { loadMessages };
};
