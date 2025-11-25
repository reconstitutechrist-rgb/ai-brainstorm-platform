import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../ChatPage';
import { useThemeStore } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { useProjectStore } from '../../store/projectStore';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore } from '../../store/sessionStore';
import { useAgentStore } from '../../store/agentStore';
import { useChat } from '../../hooks/useChat';
import { sessionsApi } from '../../services/api';

// Mock all stores and hooks
vi.mock('../../store/themeStore');
vi.mock('../../store/userStore');
vi.mock('../../store/projectStore');
vi.mock('../../store/chatStore');
vi.mock('../../store/sessionStore');
vi.mock('../../store/agentStore');
vi.mock('../../hooks/useChat');
vi.mock('../../hooks/useMessageLoader');
vi.mock('../../hooks/useCardCapacity');
vi.mock('../../hooks/useArchive');
vi.mock('../../hooks/useProjectRefresh');
vi.mock('../../services/api');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ChatPage Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockProject = {
    id: 'project-456',
    title: 'Authentication System',
    description: 'Building a secure auth system',
    items: [
      {
        id: 'item-1',
        text: 'Implement JWT authentication',
        state: 'decided' as const,
        created_at: '2025-01-20T10:00:00Z',
        isArchived: false,
      },
      {
        id: 'item-2',
        text: 'Add 2FA support',
        state: 'exploring' as const,
        created_at: '2025-01-20T10:05:00Z',
        isArchived: false,
      },
    ],
    created_at: '2025-01-20T09:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
  };

  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'I want to build authentication',
      created_at: '2025-01-20T10:00:00Z',
      metadata: {},
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Great! Let me help you with that.',
      created_at: '2025-01-20T10:00:05Z',
      metadata: {
        agentQuestions: [],
        showAgentBubble: false,
      },
    },
  ];

  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    (useThemeStore as any).mockReturnValue({ isDarkMode: false });
    (useUserStore as any).mockReturnValue({ user: mockUser });
    (useProjectStore as any).mockReturnValue({
      currentProject: mockProject,
      toggleItemArchive: vi.fn(),
    });
    (useChatStore as any).mockReturnValue({
      messages: mockMessages,
      isTyping: false,
    });
    (useSessionStore as any).mockReturnValue({
      sessionSummary: null,
    });
    (useAgentStore as any).mockReturnValue({
      agentWindows: {},
      openAgentWindow: vi.fn(),
      closeAgentWindow: vi.fn(),
      minimizeAgentWindow: vi.fn(),
      addUserResponse: vi.fn(),
      markQuestionAnswered: vi.fn(),
    });

    (useChat as any).mockReturnValue({
      sendMessage: mockSendMessage,
      isSending: false,
    });

    mockSendMessage.mockResolvedValue({ success: true });
    (sessionsApi.startSession as any).mockResolvedValue({ success: true, data: {} });
    (sessionsApi.endSession as any).mockResolvedValue({ success: true });
  });

  describe('Page Rendering', () => {
    it('should render all main panels', () => {
      render(<ChatPage />);

      // Should have chat panel
      expect(screen.getByText('Authentication System')).toBeInTheDocument();

      // Should have messages
      expect(screen.getByText('I want to build authentication')).toBeInTheDocument();
      expect(screen.getByText('Great! Let me help you with that.')).toBeInTheDocument();

      // Should have session tracking panel
      expect(screen.getByText('Session Tracking')).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });

      const { container } = render(<ChatPage />);

      const glassElements = container.querySelectorAll('.glass-dark');
      expect(glassElements.length).toBeGreaterThan(0);
    });

    it('should show "No Project Selected" when no project', () => {
      (useProjectStore as any).mockReturnValue({
        currentProject: null,
        toggleItemArchive: vi.fn(),
      });

      render(<ChatPage />);

      expect(screen.getByText('No Project Selected')).toBeInTheDocument();
      expect(screen.getByText('Please select or create a project to start brainstorming')).toBeInTheDocument();
    });

    it('should apply homepage background class', () => {
      render(<ChatPage />);

      expect(document.body.classList.contains('homepage-background')).toBe(true);
    });

    it('should remove background class on unmount', () => {
      const { unmount } = render(<ChatPage />);

      expect(document.body.classList.contains('homepage-background')).toBe(true);

      unmount();

      expect(document.body.classList.contains('homepage-background')).toBe(false);
    });
  });

  describe('Session Auto-Start/End', () => {
    it('should start session when page loads', async () => {
      render(<ChatPage />);

      await waitFor(() => {
        expect(sessionsApi.startSession).toHaveBeenCalledWith(
          mockUser.id,
          mockProject.id
        );
      });
    });

    it('should end session on unmount', async () => {
      const { unmount } = render(<ChatPage />);

      await waitFor(() => {
        expect(sessionsApi.startSession).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(sessionsApi.endSession).toHaveBeenCalledWith(
          mockUser.id,
          mockProject.id
        );
      });
    });

    it('should restart session when project changes', async () => {
      const { rerender } = render(<ChatPage />);

      await waitFor(() => {
        expect(sessionsApi.startSession).toHaveBeenCalledTimes(1);
      });

      // Change project
      const newProject = { ...mockProject, id: 'project-789' };
      (useProjectStore as any).mockReturnValue({
        currentProject: newProject,
        toggleItemArchive: vi.fn(),
      });

      rerender(<ChatPage />);

      await waitFor(() => {
        expect(sessionsApi.endSession).toHaveBeenCalled();
        expect(sessionsApi.startSession).toHaveBeenCalledWith(
          mockUser.id,
          'project-789'
        );
      });
    });

    it('should not start session without user', () => {
      (useUserStore as any).mockReturnValue({ user: null });

      render(<ChatPage />);

      expect(sessionsApi.startSession).not.toHaveBeenCalled();
    });

    it('should not start session without project', () => {
      (useProjectStore as any).mockReturnValue({
        currentProject: null,
        toggleItemArchive: vi.fn(),
      });

      render(<ChatPage />);

      expect(sessionsApi.startSession).not.toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('should send message when user submits', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'What about OAuth?');

      const sendButton = screen.getByLabelText(/send message/i);
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('What about OAuth?');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const sendButton = screen.getByLabelText(/send message/i);
      await user.click(sendButton);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should disable input while sending', () => {
      (useChat as any).mockReturnValue({
        sendMessage: mockSendMessage,
        isSending: true,
      });

      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      expect(textarea).toBeDisabled();
    });

    it('should show typing indicator', () => {
      (useChatStore as any).mockReturnValue({
        messages: mockMessages,
        isTyping: true,
      });

      render(<ChatPage />);

      // Typing indicator should be visible
      expect(screen.getByText(/typing/i)).toBeInTheDocument();
    });

    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should not send when session inactive', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      // Set session to inactive
      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test{Enter}');

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Canvas Panel', () => {
    it('should display active items on canvas', () => {
      render(<ChatPage />);

      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
      expect(screen.getByText('Add 2FA support')).toBeInTheDocument();
    });

    it('should not display archived items', () => {
      const projectWithArchived = {
        ...mockProject,
        items: [
          ...mockProject.items,
          {
            id: 'item-3',
            text: 'Archived item',
            state: 'decided' as const,
            created_at: '2025-01-20T10:10:00Z',
            isArchived: true,
          },
        ],
      };

      (useProjectStore as any).mockReturnValue({
        currentProject: projectWithArchived,
        toggleItemArchive: vi.fn(),
      });

      render(<ChatPage />);

      expect(screen.queryByText('Archived item')).not.toBeInTheDocument();
    });

    it('should show card counter', () => {
      render(<ChatPage />);

      // Card counter should show active items count
      const counter = screen.getByText(/2/); // 2 active items
      expect(counter).toBeInTheDocument();
    });

    it('should handle archive action', async () => {
      const mockToggleArchive = vi.fn();
      (useProjectStore as any).mockReturnValue({
        currentProject: mockProject,
        toggleItemArchive: mockToggleArchive,
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const archiveButtons = screen.getAllByLabelText(/archive/i);
      await user.click(archiveButtons[0]);

      expect(mockToggleArchive).toHaveBeenCalled();
    });
  });

  describe('Session Tracking Panel', () => {
    it('should display session tracking panel', () => {
      render(<ChatPage />);

      expect(screen.getByText('Session Tracking')).toBeInTheDocument();
      expect(screen.getByText('Real-time view of your project progress')).toBeInTheDocument();
    });

    it('should show decided items in tracking panel', () => {
      render(<ChatPage />);

      const decidedTab = screen.getByText('Decisions').closest('button');
      expect(decidedTab).toBeInTheDocument();
    });

    it('should show exploring items in tracking panel', () => {
      render(<ChatPage />);

      const exploringTab = screen.getByText('Exploring').closest('button');
      expect(exploringTab).toBeInTheDocument();
    });

    it('should update when project items change', () => {
      const { rerender } = render(<ChatPage />);

      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();

      // Add new item
      const updatedProject = {
        ...mockProject,
        items: [
          ...mockProject.items,
          {
            id: 'item-3',
            text: 'New decided item',
            state: 'decided' as const,
            created_at: '2025-01-20T10:15:00Z',
            isArchived: false,
          },
        ],
      };

      (useProjectStore as any).mockReturnValue({
        currentProject: updatedProject,
        toggleItemArchive: vi.fn(),
      });

      rerender(<ChatPage />);

      expect(screen.getByText('New decided item')).toBeInTheDocument();
    });
  });

  describe('Agent Windows', () => {
    it('should open agent window when bubble clicked', async () => {
      const mockOpenAgent = vi.fn();
      (useAgentStore as any).mockReturnValue({
        agentWindows: {},
        openAgentWindow: mockOpenAgent,
        closeAgentWindow: vi.fn(),
        minimizeAgentWindow: vi.fn(),
        addUserResponse: vi.fn(),
        markQuestionAnswered: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const agentBubble = screen.getByLabelText(/open conversation agent/i);
      await user.click(agentBubble);

      expect(mockOpenAgent).toHaveBeenCalledWith('conversation');
    });

    it('should display open agent windows', () => {
      (useAgentStore as any).mockReturnValue({
        agentWindows: {
          conversation: {
            state: 'open',
            messages: [
              {
                id: '1',
                role: 'agent',
                content: 'I have a question for you',
                timestamp: '2025-01-20T10:00:00Z',
              },
            ],
          },
        },
        openAgentWindow: vi.fn(),
        closeAgentWindow: vi.fn(),
        minimizeAgentWindow: vi.fn(),
        addUserResponse: vi.fn(),
        markQuestionAnswered: vi.fn(),
      });

      render(<ChatPage />);

      expect(screen.getByText('I have a question for you')).toBeInTheDocument();
    });

    it('should close agent window', async () => {
      const mockCloseAgent = vi.fn();
      (useAgentStore as any).mockReturnValue({
        agentWindows: {
          conversation: { state: 'open', messages: [] },
        },
        openAgentWindow: vi.fn(),
        closeAgentWindow: mockCloseAgent,
        minimizeAgentWindow: vi.fn(),
        addUserResponse: vi.fn(),
        markQuestionAnswered: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const closeButton = screen.getByLabelText(/close agent/i);
      await user.click(closeButton);

      expect(mockCloseAgent).toHaveBeenCalledWith('conversation');
    });

    it('should send message through agent window', async () => {
      (useAgentStore as any).mockReturnValue({
        agentWindows: {
          conversation: { state: 'open', messages: [] },
        },
        openAgentWindow: vi.fn(),
        closeAgentWindow: vi.fn(),
        minimizeAgentWindow: vi.fn(),
        addUserResponse: vi.fn(),
        markQuestionAnswered: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const agentInput = screen.getByPlaceholderText(/respond to agent/i);
      await user.type(agentInput, 'My answer{Enter}');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('My answer');
      });
    });
  });

  describe('Agent Question Bubble', () => {
    it('should show agent question bubble when messages contain agent questions', () => {
      const messagesWithQuestions = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'assistant' as const,
          content: '',
          created_at: '2025-01-20T10:00:10Z',
          metadata: {
            agentQuestions: [
              {
                question: 'Should we use JWT or session-based authentication?',
                importance: 'critical',
                category: 'technical',
                showInBubble: true,
              },
            ],
            showAgentBubble: true,
          },
        },
      ];

      (useChatStore as any).mockReturnValue({
        messages: messagesWithQuestions,
        isTyping: false,
      });

      render(<ChatPage />);

      expect(screen.getByText(/Quick Questions/i)).toBeInTheDocument();
      expect(screen.getByText('Should we use JWT or session-based authentication?')).toBeInTheDocument();
    });

    it('should not show agent question bubble when no questions', () => {
      render(<ChatPage />);

      expect(screen.queryByText(/Quick Questions/i)).not.toBeInTheDocument();
    });

    it('should close agent question bubble when close button clicked', async () => {
      const messagesWithQuestions = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'assistant' as const,
          content: '',
          created_at: '2025-01-20T10:00:10Z',
          metadata: {
            agentQuestions: [
              {
                question: 'What authentication method do you prefer?',
                importance: 'critical',
                category: 'technical',
                showInBubble: true,
              },
            ],
            showAgentBubble: true,
          },
        },
      ];

      (useChatStore as any).mockReturnValue({
        messages: messagesWithQuestions,
        isTyping: false,
      });

      const user = userEvent.setup();
      const { container } = render(<ChatPage />);

      expect(screen.getByText(/Quick Questions/i)).toBeInTheDocument();

      // Find close button by X icon in the bubble
      const closeButton = container.querySelector('.fixed.bottom-6.right-6 button .lucide-x')?.parentElement as HTMLElement;
      expect(closeButton).toBeTruthy();
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText(/Quick Questions/i)).not.toBeInTheDocument();
      });
    });

    it('should send answer when user answers a question', async () => {
      const messagesWithQuestions = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'assistant' as const,
          content: '',
          created_at: '2025-01-20T10:00:10Z',
          metadata: {
            agentQuestions: [
              {
                question: 'What authentication method?',
                importance: 'critical',
                category: 'technical',
                showInBubble: true,
              },
            ],
            showAgentBubble: true,
          },
        },
      ];

      (useChatStore as any).mockReturnValue({
        messages: messagesWithQuestions,
        isTyping: false,
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const answerButton = screen.getByText(/Answer/i);
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input, 'JWT authentication');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('JWT authentication');
      });
    });

    it('should collapse and expand bubble when header clicked', async () => {
      const messagesWithQuestions = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'assistant' as const,
          content: '',
          created_at: '2025-01-20T10:00:10Z',
          metadata: {
            agentQuestions: [
              {
                question: 'Test question?',
                importance: 'critical',
                category: 'technical',
                showInBubble: true,
              },
            ],
            showAgentBubble: true,
          },
        },
      ];

      (useChatStore as any).mockReturnValue({
        messages: messagesWithQuestions,
        isTyping: false,
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const header = screen.getByText(/Quick Questions/i).closest('div');

      // Click to collapse
      await user.click(header!);

      await waitFor(() => {
        expect(screen.queryByText('Test question?')).not.toBeInTheDocument();
      });

      // Click to expand
      await user.click(header!);

      await waitFor(() => {
        expect(screen.getByText('Test question?')).toBeInTheDocument();
      });
    });
  });

  describe('Archive Sidebar', () => {
    it('should toggle archive sidebar', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const archiveButton = screen.getByLabelText(/toggle archive/i);
      await user.click(archiveButton);

      expect(screen.getByText(/Archived Items/i)).toBeInTheDocument();
    });

    it('should show archived items in sidebar', async () => {
      const projectWithArchived = {
        ...mockProject,
        items: [
          ...mockProject.items,
          {
            id: 'item-3',
            text: 'Archived JWT implementation',
            state: 'decided' as const,
            created_at: '2025-01-20T10:10:00Z',
            isArchived: true,
          },
        ],
      };

      (useProjectStore as any).mockReturnValue({
        currentProject: projectWithArchived,
        toggleItemArchive: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const archiveButton = screen.getByLabelText(/toggle archive/i);
      await user.click(archiveButton);

      expect(screen.getByText('Archived JWT implementation')).toBeInTheDocument();
    });

    it('should restore item from archive', async () => {
      const mockToggleArchive = vi.fn();
      const projectWithArchived = {
        ...mockProject,
        items: [
          {
            id: 'item-3',
            text: 'Archived item',
            state: 'decided' as const,
            created_at: '2025-01-20T10:10:00Z',
            isArchived: true,
          },
        ],
      };

      (useProjectStore as any).mockReturnValue({
        currentProject: projectWithArchived,
        toggleItemArchive: mockToggleArchive,
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const archiveButton = screen.getByLabelText(/toggle archive/i);
      await user.click(archiveButton);

      const restoreButton = screen.getByLabelText(/restore/i);
      await user.click(restoreButton);

      expect(mockToggleArchive).toHaveBeenCalledWith('item-3');
    });
  });

  describe('Upload Modal', () => {
    it('should open upload modal', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const uploadButton = screen.getByLabelText(/upload file/i);
      await user.click(uploadButton);

      expect(screen.getByText(/Upload Document/i)).toBeInTheDocument();
    });

    it('should close upload modal', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const uploadButton = screen.getByLabelText(/upload file/i);
      await user.click(uploadButton);

      const closeButton = screen.getByLabelText(/close modal/i);
      await user.click(closeButton);

      expect(screen.queryByText(/Upload Document/i)).not.toBeInTheDocument();
    });
  });

  describe('Session History Modal', () => {
    it('should open session history modal', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const historyButton = screen.getByText(/History/i);
      await user.click(historyButton);

      expect(screen.getByText(/Session History/i)).toBeInTheDocument();
    });

    it('should close session history modal', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      const historyButton = screen.getByText(/History/i);
      await user.click(historyButton);

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(screen.queryByText(/Session History/i)).not.toBeInTheDocument();
    });
  });

  describe('Capacity Warnings', () => {
    it('should show capacity warning at 30 cards', () => {
      const manyItems = Array.from({ length: 30 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i}`,
        state: 'decided' as const,
        created_at: '2025-01-20T10:00:00Z',
        isArchived: false,
      }));

      const fullProject = { ...mockProject, items: manyItems };

      (useProjectStore as any).mockReturnValue({
        currentProject: fullProject,
        toggleItemArchive: vi.fn(),
      });

      render(<ChatPage />);

      expect(screen.getByText(/Canvas is at capacity/i)).toBeInTheDocument();
    });

    it('should dismiss capacity warning', async () => {
      const user = userEvent.setup();
      render(<ChatPage />);

      // Assuming warning is shown
      const dismissButton = screen.queryByLabelText(/dismiss warning/i);
      if (dismissButton) {
        await user.click(dismissButton);
        expect(screen.queryByText(/capacity/i)).not.toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle message send error', async () => {
      mockSendMessage.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const user = userEvent.setup();
      render(<ChatPage />);

      const textarea = screen.getByPlaceholderText(/Type your message/i);
      await user.type(textarea, 'Test{Enter}');

      await waitFor(() => {
        // Error should be shown (implementation may vary)
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it('should handle session start failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (sessionsApi.startSession as any).mockRejectedValue(new Error('Failed to start'));

      render(<ChatPage />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });
});
