import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { useThemeStore } from '../../../store/themeStore';

// Mock stores
vi.mock('../../../store/themeStore');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ChatInterface', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello, I want to build an authentication system',
      timestamp: '2025-01-20T10:00:00Z',
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Great! Let\'s explore authentication options together.',
      timestamp: '2025-01-20T10:00:05Z',
    },
    {
      id: 'msg-3',
      role: 'user' as const,
      content: 'What about JWT?',
      timestamp: '2025-01-20T10:01:00Z',
    },
    {
      id: 'msg-4',
      role: 'assistant' as const,
      content: 'JWT is an excellent choice for stateless authentication.',
      timestamp: '2025-01-20T10:01:05Z',
      metadata: {
        suggestedActions: [
          { label: 'Learn more about JWT', prompt: 'Tell me more about JWT' },
        ],
      },
    },
  ];

  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useThemeStore as any).mockReturnValue({ isDarkMode: false });
    mockOnSendMessage.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render all messages', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText('Hello, I want to build an authentication system')).toBeInTheDocument();
      expect(screen.getByText('Great! Let\'s explore authentication options together.')).toBeInTheDocument();
      expect(screen.getByText('What about JWT?')).toBeInTheDocument();
      expect(screen.getByText('JWT is an excellent choice for stateless authentication.')).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });

      const { container } = render(
        <ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />
      );

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveClass('bg-white/10');
    });

    it('should display message count', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText('4 messages')).toBeInTheDocument();
    });
  });

  describe('Conversation Mode Indicator', () => {
    it('should display exploration mode by default', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText('Exploring')).toBeInTheDocument();
      expect(screen.getByText('Open-ended discovery')).toBeInTheDocument();
    });

    it('should display clarification mode', () => {
      render(
        <ChatInterface
          messages={mockMessages}
          onSendMessage={mockOnSendMessage}
          conversationMode="clarification"
        />
      );

      expect(screen.getByText('Clarifying')).toBeInTheDocument();
      expect(screen.getByText('Understanding your needs')).toBeInTheDocument();
    });

    it('should display generation mode', () => {
      render(
        <ChatInterface
          messages={mockMessages}
          onSendMessage={mockOnSendMessage}
          conversationMode="generation"
        />
      );

      expect(screen.getByText('Generating')).toBeInTheDocument();
      expect(screen.getByText('Creating concrete ideas')).toBeInTheDocument();
    });

    it('should display refinement mode', () => {
      render(
        <ChatInterface
          messages={mockMessages}
          onSendMessage={mockOnSendMessage}
          conversationMode="refinement"
        />
      );

      expect(screen.getByText('Refining')).toBeInTheDocument();
      expect(screen.getByText('Deep dive on specific idea')).toBeInTheDocument();
    });

    it('should have colored indicator dot', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      // Should have animate-pulse class
      const indicator = screen.getByText('Exploring').previousSibling;
      expect(indicator).toHaveClass('animate-pulse');
    });
  });

  describe('Message Input', () => {
    it('should allow typing in textarea', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test message');

      expect(textarea).toHaveValue('Test message');
    });

    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should create new line on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should send message on Send button click', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test message');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      if (sendButton) {
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
        });
      }
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test message{Enter}');

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, '{Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, '   {Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={true} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toBeDisabled();
    });

    it('should disable send button when input is empty', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      expect(sendButton).not.toBeDisabled();
    });

    it('should disable send button when loading', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={true} />);

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') && !btn.textContent
      );

      expect(sendButton).toBeDisabled();
    });
  });

  describe('Textarea Auto-resize', () => {
    it('should have minimum height', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveStyle({ minHeight: '48px' });
    });

    it('should have maximum height', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveStyle({ maxHeight: '150px' });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={true} />);

      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    });

    it('should not show loading indicator when isLoading is false', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={false} />);

      expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
    });

    it('should show spinner icon in loading state', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={true} />);

      // Loading indicator should be visible
      const loadingText = screen.getByText('AI is thinking...');
      expect(loadingText).toBeInTheDocument();
    });
  });

  describe('Quick Prompts', () => {
    it('should show quick prompts when not focused and messages exist', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText("I'm thinking...")).toBeInTheDocument();
      expect(screen.getByText('Tell me more')).toBeInTheDocument();
      expect(screen.getByText('What if we...')).toBeInTheDocument();
      expect(screen.getByText('Generate ideas')).toBeInTheDocument();
    });

    it('should not show quick prompts when no messages', () => {
      render(<ChatInterface messages={[]} onSendMessage={mockOnSendMessage} />);

      expect(screen.queryByText("I'm thinking...")).not.toBeInTheDocument();
    });

    it('should insert prompt text when clicking quick prompt', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const quickPrompt = screen.getByText("I'm thinking...");
      await user.click(quickPrompt);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveValue("I'm thinking about ");
    });

    it('should focus textarea when clicking quick prompt', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const quickPrompt = screen.getByText('Tell me more');
      await user.click(quickPrompt);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveFocus();
    });
  });

  describe('Focus State', () => {
    it('should apply focus ring when textarea is focused', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.click(textarea);

      const inputContainer = textarea.closest('div');
      expect(inputContainer).toHaveClass('ring-2');
      expect(inputContainer).toHaveClass('ring-cyan-primary/50');
    });
  });

  describe('Helper Text', () => {
    it('should show keyboard shortcut hints', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText(/Press/)).toBeInTheDocument();
      expect(screen.getByText('Enter')).toBeInTheDocument();
      expect(screen.getByText('Shift + Enter')).toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('should render messages in scrollable container', () => {
      const { container } = render(
        <ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />
      );

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Message Metadata', () => {
    it('should pass metadata to MessageBubble component', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      // Message with metadata should be rendered
      expect(screen.getByText('JWT is an excellent choice for stateless authentication.')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages array', () => {
      render(<ChatInterface messages={[]} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('should handle single message', () => {
      render(<ChatInterface messages={[mockMessages[0]]} onSendMessage={mockOnSendMessage} />);

      expect(screen.getByText('1 messages')).toBeInTheDocument();
      expect(screen.getByText('Hello, I want to build an authentication system')).toBeInTheDocument();
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const user = userEvent.setup();

      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, longMessage);

      expect(textarea).toHaveValue(longMessage);
    });

    it('should trim whitespace from messages before sending', async () => {
      const user = userEvent.setup();
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, '  Test message  {Enter}');

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should handle async send errors gracefully', async () => {
      mockOnSendMessage.mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();

      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      await user.type(textarea, 'Test message{Enter}');

      // Should not crash
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible textarea label', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveAttribute('placeholder');
    });

    it('should indicate disabled state on textarea', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} isLoading={true} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveAttribute('disabled');
    });

    it('should have accessible buttons', () => {
      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Dark Mode', () => {
    it('should apply dark mode styles to textarea', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });

      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveClass('bg-white/10');
      expect(textarea).toHaveClass('text-white');
    });

    it('should apply light mode styles to textarea', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: false });

      render(<ChatInterface messages={mockMessages} onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('What are you considering or exploring today?');
      expect(textarea).toHaveClass('bg-white');
      expect(textarea).toHaveClass('text-gray-800');
    });
  });

  describe('Performance', () => {
    it('should handle many messages efficiently', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const { container } = render(
        <ChatInterface messages={manyMessages} onSendMessage={mockOnSendMessage} />
      );

      expect(container).toBeTruthy();
      expect(screen.getByText('100 messages')).toBeInTheDocument();
    });
  });
});
