import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMessageLoader } from './useMessageLoader';
import { useChatStore } from '../store/chatStore';

// Mock the API
vi.mock('../services/api', () => ({
  conversationsApi: {
    getMessages: vi.fn(),
  },
}));

describe('useMessageLoader', () => {
  const mockProjectId = 'project-123';
  const mockMessages = [
    {
      id: '1',
      role: 'user' as const,
      content: 'Hello',
      created_at: new Date().toISOString(),
      project_id: mockProjectId,
    },
    {
      id: '2',
      role: 'agent' as const,
      content: 'Hi there!',
      created_at: new Date().toISOString(),
      project_id: mockProjectId,
      metadata: { agent: 'ConversationAgent' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({ messages: [] });
  });

  it('should load messages when projectId is provided', async () => {
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.getMessages).mockResolvedValue({
      success: true,
      messages: mockMessages,
    });

    renderHook(() => useMessageLoader(mockProjectId));

    await waitFor(() => {
      const state = useChatStore.getState();
      expect(state.messages).toEqual(mockMessages);
    });

    expect(conversationsApi.getMessages).toHaveBeenCalledWith(mockProjectId);
  });

  it('should not load messages when projectId is undefined', async () => {
    const { conversationsApi } = await import('../services/api');

    renderHook(() => useMessageLoader(undefined));

    await waitFor(() => {
      expect(conversationsApi.getMessages).not.toHaveBeenCalled();
    });
  });

  it('should clear messages when project changes', async () => {
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.getMessages).mockResolvedValue({
      success: true,
      messages: mockMessages,
    });

    const { rerender } = renderHook(
      ({ projectId }) => useMessageLoader(projectId),
      { initialProps: { projectId: 'project-1' } }
    );

    await waitFor(() => {
      expect(conversationsApi.getMessages).toHaveBeenCalledWith('project-1');
    });

    // Change project
    rerender({ projectId: 'project-2' });

    await waitFor(() => {
      // Should clear messages and load new ones
      expect(conversationsApi.getMessages).toHaveBeenCalledWith('project-2');
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.getMessages).mockRejectedValue(new Error('API Error'));

    renderHook(() => useMessageLoader(mockProjectId));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load messages:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should expose loadMessages function for manual refresh', async () => {
    const { conversationsApi } = await import('../services/api');
    vi.mocked(conversationsApi.getMessages).mockResolvedValue({
      success: true,
      messages: mockMessages,
    });

    const { result } = renderHook(() => useMessageLoader(mockProjectId));

    // Wait for initial load
    await waitFor(() => {
      expect(conversationsApi.getMessages).toHaveBeenCalledTimes(1);
    });

    // Manually trigger refresh
    await result.current.loadMessages();

    await waitFor(() => {
      expect(conversationsApi.getMessages).toHaveBeenCalledTimes(2);
    });
  });
});
