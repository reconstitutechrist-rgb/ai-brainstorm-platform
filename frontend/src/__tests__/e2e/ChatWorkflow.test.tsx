import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../../pages/ChatPage';
import { useThemeStore } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { useProjectStore } from '../../store/projectStore';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore } from '../../store/sessionStore';
import { useAgentStore } from '../../store/agentStore';
import { conversationsApi, sessionsApi, projectsApi } from '../../services/api';

// Mock all dependencies
vi.mock('../../store/themeStore');
vi.mock('../../store/userStore');
vi.mock('../../store/projectStore');
vi.mock('../../store/chatStore');
vi.mock('../../store/sessionStore');
vi.mock('../../store/agentStore');
vi.mock('../../services/api');
vi.mock('../../hooks/useMessageLoader');
vi.mock('../../hooks/useCardCapacity');
vi.mock('../../hooks/useArchive');
vi.mock('../../hooks/useProjectRefresh');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('End-to-End Chat Workflow', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockProject = {
    id: 'project-456',
    title: 'Authentication System',
    description: 'Building secure authentication',
    items: [],
    created_at: '2025-01-20T09:00:00Z',
    updated_at: '2025-01-20T09:00:00Z',
  };

  let addMessageMock: any;
  let addMessagesMock: any;
  let setIsTypingMock: any;
  let projectUpdateMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    addMessageMock = vi.fn();
    addMessagesMock = vi.fn();
    setIsTypingMock = vi.fn();
    projectUpdateMock = vi.fn();

    (useThemeStore as any).mockReturnValue({ isDarkMode: false });
    (useUserStore as any).mockReturnValue({ user: mockUser });

    let currentProject = { ...mockProject };
    (useProjectStore as any).mockReturnValue({
      currentProject,
      toggleItemArchive: vi.fn(),
      updateProject: (updates: any) => {
        currentProject = { ...currentProject, ...updates };
        projectUpdateMock(updates);
      },
    });

    (useChatStore as any).mockReturnValue({
      messages: [],
      isTyping: false,
      addMessage: addMessageMock,
      addMessages: addMessagesMock,
      setIsTyping: setIsTypingMock,
    });

    (useSessionStore as any).mockReturnValue({
      sessionSummary: null,
      trackActivity: vi.fn(),
    });

    (useAgentStore as any).mockReturnValue({
      agentWindows: {},
      openAgentWindow: vi.fn(),
      closeAgentWindow: vi.fn(),
      minimizeAgentWindow: vi.fn(),
      addUserResponse: vi.fn(),
      markQuestionAnswered: vi.fn(),
      addAgentQuestion: vi.fn(),
    });

    // API mocks
    (sessionsApi.startSession as any).mockResolvedValue({
      success: true,
      data: { id: 'session-789', started_at: new Date().toISOString() },
    });

    (sessionsApi.endSession as any).mockResolvedValue({ success: true });
  });

  describe('Complete User Journey: Message → AI Response → Canvas Update', () => {
    it('should complete full workflow from user message to canvas update', async () => {
      const user = userEvent.setup();

      // Mock API response for sending message
      const userMessage = {
        id: 'msg-user-1',
        role: 'user',
        content: 'I want to implement JWT authentication',
        created_at: new Date().toISOString(),
      };

      const agentMessages = [
        {
          id: 'msg-agent-1',
          role: 'assistant',
          content: 'Great! JWT is an excellent choice for authentication.',
          created_at: new Date().toISOString(),
          agent_type: 'ConversationAgent',
        },
        {
          id: 'msg-agent-2',
          role: 'assistant',
          content: 'I\'ve added some items to your project.',
          created_at: new Date().toISOString(),
          agent_type: 'PersistenceAgent',
        },
      ];

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage,
        agentMessages,
      });

      // Mock project update with new items
      const updatedProject = {
        ...mockProject,
        items: [
          {
            id: 'item-1',
            text: 'Implement JWT token generation',
            state: 'decided',
            created_at: new Date().toISOString(),
            isArchived: false,
          },
          {
            id: 'item-2',
            text: 'Add token refresh mechanism',
            state: 'exploring',
            created_at: new Date().toISOString(),
            isArchived: false,
          },
        ],
      };

      (projectsApi.getProject as any).mockResolvedValue({
        success: true,
        project: updatedProject,
      });

      // STEP 1: Render ChatPage
      render(<ChatPage />);

      // STEP 2: Verify session started
      await waitFor(() => {
        expect(sessionsApi.startSession).toHaveBeenCalledWith(
          mockUser.id,
          mockProject.id
        );
      });

      // STEP 3: User sends message
      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'I want to implement JWT authentication');

      const sendButton = screen.getByLabelText(/send message/i);
      await user.click(sendButton);

      // STEP 4: Verify API call was made
      await waitFor(() => {
        expect(conversationsApi.sendMessage).toHaveBeenCalledWith(
          mockProject.id,
          'I want to implement JWT authentication',
          mockUser.id
        );
      });

      // STEP 5: Verify messages were added to chat
      await waitFor(() => {
        expect(addMessageMock).toHaveBeenCalledWith(userMessage);
        expect(addMessagesMock).toHaveBeenCalledWith(agentMessages);
      });

      // STEP 6: Verify AI responses appear in chat
      await waitFor(() => {
        expect(screen.getByText('Great! JWT is an excellent choice for authentication.')).toBeInTheDocument();
        expect(screen.getByText('I\'ve added some items to your project.')).toBeInTheDocument();
      });

      // STEP 7: Simulate project refresh
      (useProjectStore as any).mockReturnValue({
        currentProject: updatedProject,
        toggleItemArchive: vi.fn(),
      });

      // Re-render with updated project
      render(<ChatPage />);

      // STEP 8: Verify items appear on canvas
      await waitFor(() => {
        expect(screen.getByText('Implement JWT token generation')).toBeInTheDocument();
        expect(screen.getByText('Add token refresh mechanism')).toBeInTheDocument();
      });

      // STEP 9: Verify items appear in SessionTrackingPanel
      await waitFor(() => {
        expect(screen.getByText('Decisions')).toBeInTheDocument();
        expect(screen.getByText('Exploring')).toBeInTheDocument();
      });

      // STEP 10: Verify session is still active
      expect(sessionsApi.endSession).not.toHaveBeenCalled();
    });
  });

  describe('Agent Question → User Response → Follow-up', () => {
    it('should handle agent asking question and user responding', async () => {
      const user = userEvent.setup();

      // Mock agent asking a question
      const questionMessage = {
        id: 'msg-agent-q1',
        role: 'assistant',
        content: 'What token expiration time would you prefer?',
        created_at: new Date().toISOString(),
        agent_type: 'ConversationAgent',
        metadata: {
          isQuestion: true,
        },
      };

      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: {
          id: 'msg-user-1',
          role: 'user',
          content: 'Tell me about JWT',
          created_at: new Date().toISOString(),
        },
        agentMessages: [questionMessage],
      });

      render(<ChatPage />);

      // User sends initial message
      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Tell me about JWT{Enter}');

      // Wait for agent question
      await waitFor(() => {
        expect(screen.getByText('What token expiration time would you prefer?')).toBeInTheDocument();
      });

      // Mock agent handling user's answer
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: {
          id: 'msg-user-2',
          role: 'user',
          content: '15 minutes',
          created_at: new Date().toISOString(),
        },
        agentMessages: [
          {
            id: 'msg-agent-a1',
            role: 'assistant',
            content: 'Perfect! 15 minutes is a good balance between security and UX.',
            created_at: new Date().toISOString(),
            agent_type: 'ConversationAgent',
          },
        ],
      });

      // User responds to question
      await user.clear(textarea);
      await user.type(textarea, '15 minutes{Enter}');

      // Wait for follow-up response
      await waitFor(() => {
        expect(screen.getByText('Perfect! 15 minutes is a good balance between security and UX.')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-step Conversation Flow', () => {
    it('should handle multi-turn conversation with context building', async () => {
      const user = userEvent.setup();
      const messages: any[] = [];

      render(<ChatPage />);

      // Turn 1: User asks about authentication
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: {
          id: 'msg-1',
          role: 'user',
          content: 'I need authentication',
          created_at: new Date().toISOString(),
        },
        agentMessages: [
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Let\'s explore authentication options.',
            created_at: new Date().toISOString(),
            agent_type: 'ConversationAgent',
          },
        ],
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'I need authentication{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Let\'s explore authentication options.')).toBeInTheDocument();
      });

      // Turn 2: User specifies JWT
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: {
          id: 'msg-3',
          role: 'user',
          content: 'I want to use JWT',
          created_at: new Date().toISOString(),
        },
        agentMessages: [
          {
            id: 'msg-4',
            role: 'assistant',
            content: 'JWT is a great choice. Let me add that to your project.',
            created_at: new Date().toISOString(),
            agent_type: 'PersistenceAgent',
          },
        ],
      });

      await user.clear(textarea);
      await user.type(textarea, 'I want to use JWT{Enter}');

      await waitFor(() => {
        expect(screen.getByText('JWT is a great choice. Let me add that to your project.')).toBeInTheDocument();
      });

      // Turn 3: User asks about implementation
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: {
          id: 'msg-5',
          role: 'user',
          content: 'How should I implement it?',
          created_at: new Date().toISOString(),
        },
        agentMessages: [
          {
            id: 'msg-6',
            role: 'assistant',
            content: 'Here are the key implementation steps...',
            created_at: new Date().toISOString(),
            agent_type: 'StrategicAgent',
          },
        ],
      });

      await user.clear(textarea);
      await user.type(textarea, 'How should I implement it?{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Here are the key implementation steps...')).toBeInTheDocument();
      });

      // Verify all messages were sent with correct context
      expect(conversationsApi.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Session Lifecycle', () => {
    it('should handle complete session from start to end', async () => {
      const user = userEvent.setup();

      render(<ChatPage />);

      // Session starts automatically
      await waitFor(() => {
        expect(sessionsApi.startSession).toHaveBeenCalled();
      });

      // User has conversation
      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: '1', role: 'user', content: 'Test' },
        agentMessages: [{ id: '2', role: 'assistant', content: 'Response' }],
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(conversationsApi.sendMessage).toHaveBeenCalled();
      });

      // User ends session
      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      // Session should end when component unmounts
      // (In real app, this happens when navigating away)
    });

    it('should track activity on each message', async () => {
      const trackActivityMock = vi.fn();
      (useSessionStore as any).mockReturnValue({
        sessionSummary: null,
        trackActivity: trackActivityMock,
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: '1', role: 'user', content: 'Test' },
        agentMessages: [],
      });

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test{Enter}');

      await waitFor(() => {
        expect(trackActivityMock).toHaveBeenCalledWith(mockUser.id, mockProject.id);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle network error and allow retry', async () => {
      const user = userEvent.setup();

      // First attempt fails
      (conversationsApi.sendMessage as any).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(conversationsApi.sendMessage).toHaveBeenCalled();
      });

      // Message should still be in input for retry
      expect(textarea).toHaveValue('Test message');

      // Second attempt succeeds
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: { id: '1', role: 'user', content: 'Test message' },
        agentMessages: [{ id: '2', role: 'assistant', content: 'Success!' }],
      });

      // Retry
      const sendButton = screen.getByLabelText(/send message/i);
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Success!')).toBeInTheDocument();
      });
    });

    it('should continue working after API timeout', async () => {
      const user = userEvent.setup();

      // Simulate timeout
      (conversationsApi.sendMessage as any).mockRejectedValueOnce({
        message: 'Request timeout',
        response: { data: { error: 'Request timed out after 30 seconds' } },
      });

      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'First message{Enter}');

      await waitFor(() => {
        expect(conversationsApi.sendMessage).toHaveBeenCalled();
      });

      // Second message should work
      (conversationsApi.sendMessage as any).mockResolvedValueOnce({
        success: true,
        userMessage: { id: '3', role: 'user', content: 'Second message' },
        agentMessages: [{ id: '4', role: 'assistant', content: 'Working now!' }],
      });

      await user.clear(textarea);
      await user.type(textarea, 'Second message{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Working now!')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show typing indicator while AI responds', async () => {
      const user = userEvent.setup();

      let resolveMessage: any;
      const messagePromise = new Promise((resolve) => {
        resolveMessage = resolve;
      });

      (conversationsApi.sendMessage as any).mockReturnValue(messagePromise);

      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test{Enter}');

      // Typing indicator should appear
      await waitFor(() => {
        expect(setIsTypingMock).toHaveBeenCalledWith(true);
      });

      // Resolve the message
      resolveMessage({
        success: true,
        userMessage: { id: '1', role: 'user', content: 'Test' },
        agentMessages: [{ id: '2', role: 'assistant', content: 'Done!' }],
      });

      // Typing indicator should disappear
      await waitFor(() => {
        expect(setIsTypingMock).toHaveBeenCalledWith(false);
      });
    });

    it('should update canvas immediately when items added', async () => {
      const user = userEvent.setup();

      const updatedProject = {
        ...mockProject,
        items: [
          {
            id: 'item-1',
            text: 'New item from AI',
            state: 'decided' as const,
            created_at: new Date().toISOString(),
            isArchived: false,
          },
        ],
      };

      (conversationsApi.sendMessage as any).mockResolvedValue({
        success: true,
        userMessage: { id: '1', role: 'user', content: 'Add item' },
        agentMessages: [{ id: '2', role: 'assistant', content: 'Added!' }],
      });

      (projectsApi.getProject as any).mockResolvedValue({
        success: true,
        project: updatedProject,
      });

      // Mock project store to update immediately
      let currentItems: any[] = [];
      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockProject,
          items: currentItems,
        },
        toggleItemArchive: vi.fn(),
      });

      const { rerender } = render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Add item{Enter}');

      // Simulate project refresh
      currentItems = updatedProject.items;
      (useProjectStore as any).mockReturnValue({
        currentProject: updatedProject,
        toggleItemArchive: vi.fn(),
      });

      rerender(<ChatPage />);

      await waitFor(() => {
        expect(screen.getByText('New item from AI')).toBeInTheDocument();
      });
    });
  });
});
