import { useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';
import { useSessionStore } from '../store/sessionStore';
import { useAgentStore } from '../store/agentStore';
import { conversationsApi } from '../services/api';
import { useProjectRefresh } from './useProjectRefresh';

/**
 * Custom hook to handle chat message sending and agent interactions
 * Consolidates message sending logic and eliminates duplication
 */
export const useChat = (projectId?: string) => {
  const [isSending, setIsSending] = useState(false);
  const { user } = useUserStore();
  const { addMessage, addMessages, setIsTyping } = useChatStore();
  const { trackActivity } = useSessionStore();
  const { addAgentQuestion } = useAgentStore();
  const refreshProject = useProjectRefresh();

  /**
   * Handle agent question detection and create agent windows
   */
  const handleAgentQuestions = useCallback((agentMessages: any[]) => {
    agentMessages.forEach((msg: any) => {
      if (msg.metadata?.isQuestion && msg.agent_type) {
        const agentType = msg.agent_type.replace(/Agent$/i, '').toLowerCase();
        addAgentQuestion(agentType, {
          id: msg.id,
          role: 'agent',
          content: msg.content,
          timestamp: msg.created_at,
          messageId: msg.id,
        });
      }
    });
  }, [addAgentQuestion]);

  /**
   * Send a message and handle the response
   */
  const sendMessage = useCallback(async (messageText: string) => {
    if (!projectId || !messageText.trim()) {
      console.log('❌ Cannot send message: missing projectId or empty message');
      return { success: false, error: 'Invalid input' };
    }

    setIsSending(true);
    setIsTyping(true);

    try {
      // Debug logging to identify user ID issue
      console.log('=== USER AUTHENTICATION DEBUG ===');
      console.log('📌 Full user object:', user);
      console.log('📌 user?.id:', user?.id);
      console.log('📌 typeof user?.id:', typeof user?.id);
      console.log('📌 user exists:', !!user);

      // Use a valid UUID for demo user (matches the demo user UUID in database)
      const userId = user?.id || '00000000-0000-0000-0000-000000000001';

      console.log('📌 Final userId being sent to backend:', userId);
      console.log('📌 Is using demo user fallback:', !user?.id);
      console.log('=================================');
      console.log('🚀 Sending message to project:', projectId);

      const response = await conversationsApi.sendMessage(
        projectId,
        messageText,
        userId
      );

      console.log('✅ API Response received:', response);

      if (response.success) {
        // Add messages to chat
        addMessage(response.userMessage);
        addMessages(response.agentMessages);

        // Handle agent questions
        handleAgentQuestions(response.agentMessages);

        // Track activity
        if (user && projectId) {
          trackActivity(user.id, projectId);
        }

        // Apply incremental updates if available (always empty in fast-response mode)
        if (response.updates?.itemsAdded?.length > 0 || response.updates?.itemsModified?.length > 0) {
          const { useProjectStore } = await import('../store/projectStore');

          if (response.updates.itemsAdded?.length > 0) {
            console.log(`[useChat] Adding ${response.updates.itemsAdded.length} new items`);
            useProjectStore.getState().addItems(response.updates.itemsAdded);
          }

          if (response.updates.itemsModified?.length > 0) {
            console.log(`[useChat] Updating ${response.updates.itemsModified.length} items`);
            useProjectStore.getState().updateItems(response.updates.itemsModified);
          }

          console.log('[useChat] ✅ Incremental updates applied (skipped full refresh)');
        }

        // Poll for background updates with exponential backoff
        // This handles cases where background workflow takes longer than initial poll
        const pollForUpdates = async (attempt = 1, maxAttempts = 6) => {
          try {
            const delay = Math.min(500 * Math.pow(1.5, attempt - 1), 10000); // 500ms, 750ms, 1125ms, 1687ms, 2531ms, 3796ms (max 10s)

            console.log(`[useChat] 🔄 Polling for background updates (attempt ${attempt}/${maxAttempts}) after ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));

            const updatesResponse = await conversationsApi.getPendingUpdates(projectId);

            if (updatesResponse.success && updatesResponse.hasUpdates) {
              console.log('[useChat] ✅ Received background updates:', updatesResponse.updates);
              const { useProjectStore } = await import('../store/projectStore');

              if (updatesResponse.updates.itemsAdded?.length > 0) {
                console.log(`[useChat] Adding ${updatesResponse.updates.itemsAdded.length} new items from background`);
                useProjectStore.getState().addItems(updatesResponse.updates.itemsAdded);
              }

              if (updatesResponse.updates.itemsModified?.length > 0) {
                console.log(`[useChat] Updating ${updatesResponse.updates.itemsModified.length} items from background`);
                useProjectStore.getState().updateItems(updatesResponse.updates.itemsModified);
              }

              console.log('[useChat] ✅ Background updates applied');
            } else if (attempt < maxAttempts) {
              // No updates yet, try again
              console.log(`[useChat] ⚠️ No updates yet, retrying (${attempt}/${maxAttempts})...`);
              await pollForUpdates(attempt + 1, maxAttempts);
            } else {
              // Max attempts reached, fall back to full refresh
              console.log('[useChat] ⚠️ Max polling attempts reached, falling back to full refresh');
              if (user && projectId) {
                await refreshProject(projectId, user.id);
              }
            }
          } catch (error) {
            console.error(`[useChat] ❌ Failed to poll for updates (attempt ${attempt}/${maxAttempts}):`, error);
            if (attempt < maxAttempts) {
              // Retry on error
              console.log(`[useChat] Retrying after error...`);
              await pollForUpdates(attempt + 1, maxAttempts);
            } else {
              // Max attempts reached, fall back to full refresh
              console.log('[useChat] ❌ Max polling attempts reached after errors, falling back to full refresh');
              if (user && projectId) {
                await refreshProject(projectId, user.id);
              }
            }
          }
        };

        // Start polling (no need to await, let it run in background)
        pollForUpdates();

        return { success: true };
      }

      return { success: false, error: 'API request failed' };
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to send message. The AI agents may be taking longer than expected.';
      return { success: false, error: errorMsg };
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  }, [projectId, user, addMessage, addMessages, setIsTyping, trackActivity, refreshProject, handleAgentQuestions]);

  return {
    sendMessage,
    isSending,
  };
};
