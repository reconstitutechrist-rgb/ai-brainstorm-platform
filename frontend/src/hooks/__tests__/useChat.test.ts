import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useSessionStore } from '../../store/sessionStore';
import { useAgentStore } from '../../store/agentStore';
import { conversationsApi } from '../../services/api';
import { useProjectRefresh } from '../useProjectRefresh';

// Mock all dependencies
vi.mock('../../store/chatStore');
vi.mock('../../store/userStore');
vi.mock('../../store/sessionStore');
vi.mock('../../store/agentStore');
vi.mock('../../services/api');
vi.mock('../useProjectRefresh');

describe('useChat', () => {
  const mockProjectId = 'project-123';
  const mockUserId = 'user-456';

  const mockAddMessage = vi.fn();
  const mockAddMessages = vi.fn();
  const mockSetIsTyping = vi.fn();
  const mockTrackActivity = vi.fn();
  const mockAddAgentQuestion = vi.fn();
  const mockRefreshProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup store mocks
    (useChatStore as any).mockReturnValue({
      addMessage: mockAddMessage,
      addMessages: mockAddMessages,
      setIsTyping: mockSetIsTyping,
    });

    (useUserStore as any).mockReturnValue({
      user: { id: mockUserId, name: 'Test User' },
    });

    (useSessionStore as any).mockReturnValue({
      trackActivity: mockTrackActivity,
    });

    (useAgentStore as any).mockReturnValue({
      addAgentQuestion: mockAddAgentQuestion,
    });

    (useProjectRefresh as any).mockReturnValue(mockRefreshProject);

    mockRefreshProject.mockResolvedValue(undefined);
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockUserMessage = {
        id: 'msg-user-1',
        role: 'user',
        content: 'Hello AI',
        created_at: '2025-01-20T10:00:00Z',
      };

      const mockAgentMessages = [
        {
          id: 'msg-agent-1',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          created_at: '2025-01-20T10:00:05Z',
          agent_type: 'ConversationAgent',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: mockUserMessage,
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Hello AI');
      });

      expect(sendResult.success).toBe(true);
      expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
        mockProjectId,
        'Hello AI',
        mockUserId
      );
      expect(mockAddMessage).toHaveBeenCalledWith(mockUserMessage);
      expect(mockAddMessages).toHaveBeenCalledWith(mockAgentMessages);
    });

    it('should set loading state during send', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (conversationsApi.sendMessage as any).mockReturnValue(promise);

      const { result } = renderHook(() => useChat(mockProjectId));

      // Start sending
      act(() => {
        result.current.sendMessage('Test message');
      });

      // Should be sending
      expect(result.current.isSending).toBe(true);
      expect(mockSetIsTyping).toHaveBeenCalledWith(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({
          success: true,
          userMessage: {},
          agentMessages: [],
        });
      });

      // Should no longer be sending
      await waitFor(() => {
        expect(result.current.isSending).toBe(false);
      });
      expect(mockSetIsTyping).toHaveBeenCalledWith(false);
    });

    it('should not send message without projectId', async () => {
      const { result } = renderHook(() => useChat(undefined));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Test');
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('Invalid input');
      expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send empty message', async () => {
      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('');
      });

      expect(sendResult.success).toBe(false);
      expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only message', async () => {
      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('   ');
      });

      expect(sendResult.success).toBe(false);
      expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should track activity after successful send', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockTrackActivity).toHaveBeenCalledWith(mockUserId, mockProjectId);
    });

    it('should refresh project after successful send', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockRefreshProject).toHaveBeenCalledWith(mockProjectId, mockUserId);
    });

    it('should handle API failure', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Test message');
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('API request failed');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      (conversationsApi.sendMessage as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Test message');
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toContain('Failed to send message');
    });

    it('should handle API error responses', async () => {
      const apiError: any = new Error('Timeout');
      apiError.response = {
        data: {
          error: 'Request timed out after 30 seconds',
        },
      };

      (conversationsApi.sendMessage as any).mockRejectedValue(apiError);

      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Test message');
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('Request timed out after 30 seconds');
    });

    it('should use demo user when no user logged in', async () => {
      (useUserStore as any).mockReturnValue({ user: null });

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
        mockProjectId,
        'Test message',
        'demo-user-123'
      );
    });
  });

  describe('handleAgentQuestions', () => {
    it('should detect and handle agent questions', async () => {
      const mockAgentMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'What authentication method would you prefer?',
          agent_type: 'ConversationAgent',
          metadata: { isQuestion: true },
          created_at: '2025-01-20T10:00:00Z',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockAddAgentQuestion).toHaveBeenCalledWith('conversation', {
        id: 'msg-1',
        role: 'agent',
        content: 'What authentication method would you prefer?',
        timestamp: '2025-01-20T10:00:00Z',
        messageId: 'msg-1',
      });
    });

    it('should handle multiple agent questions', async () => {
      const mockAgentMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Question 1',
          agent_type: 'ConversationAgent',
          metadata: { isQuestion: true },
          created_at: '2025-01-20T10:00:00Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Question 2',
          agent_type: 'QualityAgent',
          metadata: { isQuestion: true },
          created_at: '2025-01-20T10:00:05Z',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockAddAgentQuestion).toHaveBeenCalledTimes(2);
    });

    it('should normalize agent type by removing "Agent" suffix', async () => {
      const mockAgentMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Question',
          agent_type: 'ConversationAgent',
          metadata: { isQuestion: true },
          created_at: '2025-01-20T10:00:00Z',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      // Should be called with 'conversation' not 'conversationagent'
      expect(mockAddAgentQuestion).toHaveBeenCalledWith(
        'conversation',
        expect.any(Object)
      );
    });

    it('should not add non-question messages', async () => {
      const mockAgentMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'This is a statement, not a question',
          agent_type: 'ConversationAgent',
          metadata: { isQuestion: false },
          created_at: '2025-01-20T10:00:00Z',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockAddAgentQuestion).not.toHaveBeenCalled();
    });

    it('should handle messages without metadata', async () => {
      const mockAgentMessages = [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Message without metadata',
          agent_type: 'ConversationAgent',
          created_at: '2025-01-20T10:00:00Z',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: mockAgentMessages,
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockAddAgentQuestion).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should initialize with isSending as false', () => {
      const { result } = renderHook(() => useChat(mockProjectId));

      expect(result.current.isSending).toBe(false);
    });

    it('should set isSending to true while sending', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (conversationsApi.sendMessage as any).mockReturnValue(promise);

      const { result } = renderHook(() => useChat(mockProjectId));

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(result.current.isSending).toBe(true);

      await act(async () => {
        resolvePromise({ success: true, userMessage: {}, agentMessages: [] });
      });
    });

    it('should set isSending to false after successful send', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.isSending).toBe(false);
    });

    it('should set isSending to false after failed send', async () => {
      (conversationsApi.sendMessage as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.isSending).toBe(false);
    });

    it('should set isTyping to true while sending', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (conversationsApi.sendMessage as any).mockReturnValue(promise);

      const { result } = renderHook(() => useChat(mockProjectId));

      act(() => {
        result.current.sendMessage('Test');
      });

      expect(mockSetIsTyping).toHaveBeenCalledWith(true);

      await act(async () => {
        resolvePromise({ success: true, userMessage: {}, agentMessages: [] });
      });

      expect(mockSetIsTyping).toHaveBeenCalledWith(false);
    });
  });

  describe('Project Refresh', () => {
    it('should not refresh project if no user', async () => {
      (useUserStore as any).mockReturnValue({ user: null });

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockRefreshProject).not.toHaveBeenCalled();
    });

    it('should not refresh project if no projectId', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(undefined));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockRefreshProject).not.toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      mockRefreshProject.mockRejectedValue(new Error('Refresh failed'));

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: {},
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      // Should not throw
      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockRefreshProject).toHaveBeenCalled();
    });
  });

  describe('Hook Updates', () => {
    it('should update when projectId changes', () => {
      const { result, rerender } = renderHook(
        ({ projectId }) => useChat(projectId),
        { initialProps: { projectId: 'project-1' } }
      );

      expect(result.current).toBeDefined();

      // Change projectId
      rerender({ projectId: 'project-2' });

      expect(result.current).toBeDefined();
    });

    it('should handle projectId changing to undefined', () => {
      const { result, rerender } = renderHook(
        ({ projectId }) => useChat(projectId),
        { initialProps: { projectId: 'project-1' as string | undefined } }
      );

      expect(result.current).toBeDefined();

      // Change to undefined
      rerender({ projectId: undefined });

      expect(result.current).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty agent messages array', async () => {
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: 'msg-1', content: 'Test' },
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      let sendResult: any;
      await act(async () => {
        sendResult = await result.current.sendMessage('Test');
      });

      expect(sendResult.success).toBe(true);
      expect(mockAddMessages).toHaveBeenCalledWith([]);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: 'msg-1', content: longMessage },
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage(longMessage);
      });

      expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
        mockProjectId,
        longMessage,
        mockUserId
      );
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = '<script>alert("xss")</script>';

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: 'msg-1', content: specialMessage },
        agentMessages: [],
      });

      const { result } = renderHook(() => useChat(mockProjectId));

      await act(async () => {
        await result.current.sendMessage(specialMessage);
      });

      expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
        mockProjectId,
        specialMessage,
        mockUserId
      );
    });
  });
});
