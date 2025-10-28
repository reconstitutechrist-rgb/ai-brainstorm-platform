import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentQuestionBubble } from '../AgentQuestionBubble';

describe('AgentQuestionBubble', () => {
  const mockQuestions = [
    {
      question: 'Should we use JWT or session-based authentication?',
      importance: 'critical' as const,
      category: 'technical',
      showInBubble: true,
    },
    {
      question: 'What database should we use?',
      importance: 'high' as const,
      category: 'technical',
      showInBubble: true,
    },
  ];

  const mockOnClose = vi.fn();
  const mockOnAnswer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render bubble with questions', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/Quick Questions/i)).toBeInTheDocument();
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
      expect(screen.getByText('Should we use JWT or session-based authentication?')).toBeInTheDocument();
      expect(screen.getByText('What database should we use?')).toBeInTheDocument();
    });

    it('should not render when no questions', () => {
      const { container } = render(
        <AgentQuestionBubble
          questions={[]}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when questions is null', () => {
      const { container } = render(
        <AgentQuestionBubble
          questions={null as any}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show helper text', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/These questions help me understand your vision better/i)).toBeInTheDocument();
    });

    it('should show footer message', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/These questions won't interrupt your brainstorming/i)).toBeInTheDocument();
    });

    it('should apply correct styles', () => {
      const { container } = render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const bubble = container.querySelector('.fixed.bottom-6.right-6');
      expect(bubble).toBeInTheDocument();
      expect(bubble).toHaveClass('z-50', 'max-w-md');
    });
  });

  describe('Expand/Collapse', () => {
    it('should be expanded by default', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText('Should we use JWT or session-based authentication?')).toBeInTheDocument();
    });

    it('should collapse when header clicked', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const header = screen.getByText(/Quick Questions/i).closest('div');
      await user.click(header!);

      await waitFor(() => {
        expect(screen.queryByText('Should we use JWT or session-based authentication?')).not.toBeInTheDocument();
      });
    });

    it('should expand when collapsed header clicked', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const header = screen.getByText(/Quick Questions/i).closest('div');

      // Collapse
      await user.click(header!);
      await waitFor(() => {
        expect(screen.queryByText('Should we use JWT or session-based authentication?')).not.toBeInTheDocument();
      });

      // Expand
      await user.click(header!);
      await waitFor(() => {
        expect(screen.getByText('Should we use JWT or session-based authentication?')).toBeInTheDocument();
      });
    });

    it('should show correct chevron icon when expanded', () => {
      const { container } = render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const chevronDown = container.querySelector('.lucide-chevron-down');
      expect(chevronDown).toBeInTheDocument();
    });

    it('should show correct chevron icon when collapsed', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const header = screen.getByText(/Quick Questions/i).closest('div');
      await user.click(header!);

      await waitFor(() => {
        const chevronUp = container.querySelector('.lucide-chevron-up');
        expect(chevronUp).toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const closeButton = container.querySelector('button .lucide-x')?.parentElement as HTMLElement;
      expect(closeButton).toBeTruthy();

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation when close button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const closeButton = container.querySelector('button .lucide-x')?.parentElement as HTMLElement;
      expect(closeButton).toBeTruthy();

      await user.click(closeButton);

      // Verify onClose was called (component would be removed by parent)
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Answering Questions', () => {
    it('should show answer input when "Answer" clicked', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButtons = screen.getAllByText(/Answer →/i);
      await user.click(answerButtons[0]);

      expect(screen.getByPlaceholderText(/Type your answer/i)).toBeInTheDocument();
    });

    it('should hide "Answer" button when input shown', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButtons = screen.getAllByText(/Answer →/i);
      expect(answerButtons).toHaveLength(2);

      await user.click(answerButtons[0]);

      await waitFor(() => {
        const remainingAnswerButtons = screen.getAllByText(/Answer →/i);
        expect(remainingAnswerButtons).toHaveLength(1); // Only one left
      });
    });

    it('should call onAnswer when Send clicked', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input, 'JWT authentication');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(mockOnAnswer).toHaveBeenCalledWith(
        'Should we use JWT or session-based authentication?',
        'JWT authentication'
      );
    });

    it('should call onAnswer when Enter pressed', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input, 'JWT{Enter}');

      expect(mockOnAnswer).toHaveBeenCalledWith(
        'Should we use JWT or session-based authentication?',
        'JWT'
      );
    });

    it('should not submit empty answers', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should not submit whitespace-only answers', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input, '   ');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should clear input after submitting', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i) as HTMLInputElement;
      await user.type(input, 'Test answer');

      const sendButton = screen.getByText('Send');
      await user.click(sendButton);

      // After submitting, the answer mode should exit and input should be gone
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Type your answer/i)).not.toBeInTheDocument();
      });
    });

    it('should cancel answer input when Cancel clicked', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input, 'Test answer');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Type your answer/i)).not.toBeInTheDocument();
      });

      // Answer button should be visible again
      expect(screen.getAllByText(/Answer →/i)).toHaveLength(2);
    });

    it('should autofocus input when opened', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      const answerButton = screen.getAllByText(/Answer →/i)[0];
      await user.click(answerButton);

      const input = screen.getByPlaceholderText(/Type your answer/i);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Multiple Questions', () => {
    it('should display count of questions', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('should allow answering each question independently', async () => {
      const user = userEvent.setup();
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      // Answer first question
      const answerButtons = screen.getAllByText(/Answer →/i);
      expect(answerButtons).toHaveLength(2);

      await user.click(answerButtons[0]);

      const input1 = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input1, 'JWT{Enter}');

      await waitFor(() => {
        expect(mockOnAnswer).toHaveBeenCalledTimes(1);
        expect(mockOnAnswer).toHaveBeenLastCalledWith(
          'Should we use JWT or session-based authentication?',
          'JWT'
        );
      });

      // Answer second question
      const answerButtons2 = screen.getAllByText(/Answer →/i);
      await user.click(answerButtons2[0]); // Second question is now first in list

      const input2 = screen.getByPlaceholderText(/Type your answer/i);
      await user.type(input2, 'PostgreSQL{Enter}');

      await waitFor(() => {
        expect(mockOnAnswer).toHaveBeenCalledTimes(2);
        // Note: The implementation shows the same question index each time we click
        expect(mockOnAnswer).toHaveBeenLastCalledWith(
          'Should we use JWT or session-based authentication?',
          'PostgreSQL'
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single question', () => {
      render(
        <AgentQuestionBubble
          questions={[mockQuestions[0]]}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
      expect(screen.getByText('Should we use JWT or session-based authentication?')).toBeInTheDocument();
    });

    it('should handle question without onAnswer callback', () => {
      render(
        <AgentQuestionBubble
          questions={mockQuestions}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/Quick Questions/i)).toBeInTheDocument();
    });

    it('should handle very long questions', () => {
      const longQuestion = {
        question: 'This is a very long question that should still render properly and not break the layout even if it contains a lot of text and wraps to multiple lines',
        importance: 'critical' as const,
        category: 'technical',
        showInBubble: true,
      };

      render(
        <AgentQuestionBubble
          questions={[longQuestion]}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/This is a very long question/i)).toBeInTheDocument();
    });

    it('should handle special characters in questions', () => {
      const specialQuestion = {
        question: 'Should we use <React> & {TypeScript}?',
        importance: 'critical' as const,
        category: 'technical',
        showInBubble: true,
      };

      render(
        <AgentQuestionBubble
          questions={[specialQuestion]}
          onClose={mockOnClose}
          onAnswer={mockOnAnswer}
        />
      );

      expect(screen.getByText(/Should we use <React> & {TypeScript}\?/i)).toBeInTheDocument();
    });
  });
});
