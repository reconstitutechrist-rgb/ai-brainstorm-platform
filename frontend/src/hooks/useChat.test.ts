import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChat } from './useChat';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';
import { useSessionStore } from '../store/sessionStore';
import { useAgentStore } from '../store/agentStore';

// Mock all dependencies
vi.mock('../services/api', () => ({
  conversationsApi: {
    sendMessage: vi.fn(),
  },
  projectsApi: {
    getByUserId: vi.fn(),
  },
  sessionsApi: {
    startSession: vi.fn(),
    endSession: vi.fn(),
    getSessionSummary: vi.fn(),
    trackActivity: vi.fn(),
    getSummary: vi.fn(),
    getSuggestedSteps: vi.fn(),
    getBlockers: vi.fn(),
  },
}));

vi.mock('./useProjectRefresh', () => ({
  useProjectRefresh: vi.fn(() => vi.fn()),
}));

describe('useChat', () => {
  const mockProjectId = 'project-123';
  const mockUserId = 'user-456';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserMessage = {
    id: '1',
    role: 'user' as const,
    content: 'Test message',
    created_at: new Date().toISOString(),
    project_id: mockProjectId,
  };

  const mockAgentMessage = {
    id: '2',
    role: 'agent' as const,
    content: 'Agent response',
    created_at: new Date().toISOString(),
    project_id: mockProjectId,
    agent_type: 'ConversationAgent',
    metadata: {
      agent: 'ConversationAgent',
      isQuestion: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      messages: [],
      isTyping: false,
      activeAgents: [],
    });
    useUserStore.setState({ user: mockUser });
    useSessionStore.setState({
      sessions: [],
    });
    useAgentStore.setState({
      agentWindows: {},
    });
  });

  it('should send message successfully', async () => {
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({
      success: true,
      userMessage: mockUserMessage,
      agentMessages: [mockAgentMessage],
    });

    const { result } = renderHook(() => useChat(mockProjectId));

    let response;
    await act(async () => {
      response = await result.current.sendMessage('Test message');
    });

    expect(response).toEqual({ success: true });
    expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
      mockProjectId,
      'Test message',
      mockUserId
    );

    const state = useChatStore.getState();
    expect(state.messages).toContainEqual(mockUserMessage);
    expect(state.messages).toContainEqual(mockAgentMessage);
  });

  it('should set typing indicator during send', async () => {
    const { conversationsApi } = await import('../services/api');
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(conversationsApi.sendMessage).mockReturnValue(promise as any);

    const { result } = renderHook(() => useChat(mockProjectId));

    act(() => {
      result.current.sendMessage('Test message');
    });

    // Should be typing during API call
    await waitFor(() => {
      expect(result.current.isSending).toBe(true);
      const state = useChatStore.getState();
      expect(state.isTyping).toBe(true);
    });

    // Resolve the API call
    act(() => {
      resolvePromise!({
        success: true,
        userMessage: mockUserMessage,
        agentMessages: [mockAgentMessage],
      });
    });

    // Should clear typing after completion
    await waitFor(() => {
      expect(result.current.isSending).toBe(false);
      const state = useChatStore.getState();
      expect(state.isTyping).toBe(false);
    });
  });

  it('should handle agent questions', async () => {
    const questionMessage = {
      ...mockAgentMessage,
      id: '3',
      metadata: {
        agent: 'ConversationAgent',
        isQuestion: true,
      },
    };

    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({
      success: true,
      userMessage: mockUserMessage,
      agentMessages: [questionMessage],
    });

    const { result } = renderHook(() => useChat(mockProjectId));

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    const agentState = useAgentStore.getState();
    expect(agentState.agentWindows.conversation).toBeDefined();
    expect(agentState.agentWindows.conversation.thread).toHaveLength(1);
    expect(agentState.agentWindows.conversation.pendingQuestions).toBe(1);
  });

  it('should not send empty messages', async () => {
    const { conversationsApi } = await import('../services/api');

    const { result } = renderHook(() => useChat(mockProjectId));

    let response;
    await act(async () => {
      response = await result.current.sendMessage('   ');
    });

    expect(response).toEqual({ success: false, error: 'Invalid input' });
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
  });

  it('should not send without projectId', async () => {
    const { conversationsApi } = await import('../services/api');

    const { result } = renderHook(() => useChat(undefined));

    let response;
    await act(async () => {
      response = await result.current.sendMessage('Test message');
    });

    expect(response).toEqual({ success: false, error: 'Invalid input' });
    expect(conversationsApi.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.sendMessage).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useChat(mockProjectId));

    let response;
    await act(async () => {
      response = await result.current.sendMessage('Test message');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Network error');

    consoleSpy.mockRestore();
  });

  it('should track activity after successful send', async () => {
    const trackActivitySpy = vi.fn();
    useSessionStore.setState({
      sessions: [],
      trackActivity: trackActivitySpy,
    });

    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({
      success: true,
      userMessage: mockUserMessage,
      agentMessages: [mockAgentMessage],
    });

    const { result } = renderHook(() => useChat(mockProjectId));

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      expect(trackActivitySpy).toHaveBeenCalledWith(mockUserId, mockProjectId);
    });
  });

  it('should refresh project after successful send', async () => {
    const { useProjectRefresh } = await import('./useProjectRefresh');
    const mockRefresh = vi.fn();
    vi.mocked(useProjectRefresh).mockReturnValue(mockRefresh);

    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.sendMessage).mockResolvedValue({
      success: true,
      userMessage: mockUserMessage,
      agentMessages: [mockAgentMessage],
    });

    const { result } = renderHook(() => useChat(mockProjectId));

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith(mockProjectId, mockUserId);
    });
  });
});
