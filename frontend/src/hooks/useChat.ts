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
      const userId = user?.id || 'demo-user-123';
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

        // Track activity and refresh project
        if (user && projectId) {
          trackActivity(user.id, projectId);
          await refreshProject(projectId, user.id);
        }

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
