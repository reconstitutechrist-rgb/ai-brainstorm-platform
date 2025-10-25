import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionReviewModal } from '../SessionReviewModal';

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock theme store
vi.mock('../../../store/themeStore', () => ({
  useThemeStore: () => ({ isDarkMode: false }),
}));

describe('SessionReviewModal - Critical Path', () => {
  const mockTopicGroups = [
    {
      topic: 'Authentication',
      icon: '🔐',
      ideas: [
        {
          id: 'idea-1',
          idea: {
            title: 'OAuth Support',
            description: 'Add OAuth login',
          },
          conversationContext: { topic: 'Authentication' },
        },
        {
          id: 'idea-2',
          idea: {
            title: 'Two-Factor Auth',
            description: 'Add 2FA support',
          },
          conversationContext: { topic: 'Authentication' },
        },
      ],
    },
    {
      topic: 'UI Design',
      icon: '🎨',
      ideas: [
        {
          id: 'idea-3',
          idea: {
            title: 'Dark Mode',
            description: 'Add dark theme',
          },
          conversationContext: { topic: 'UI Design' },
        },
      ],
    },
  ];

  const mockSummaryText = 'You discussed 3 ideas across 2 topics.';

  const mockOnSubmitDecisions = vi.fn();
  const mockOnConfirmFinal = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Summary Display', () => {
    it('should render summary step correctly', () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Session Review')).toBeInTheDocument();
      expect(screen.getByText('Review all ideas discussed')).toBeInTheDocument();
      expect(screen.getByText(mockSummaryText)).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('UI Design')).toBeInTheDocument();
      expect(screen.getByText('2 ideas')).toBeInTheDocument();
      expect(screen.getByText('1 idea')).toBeInTheDocument();
    });

    it('should list all ideas under each topic', () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/OAuth Support/)).toBeInTheDocument();
      expect(screen.getByText(/Two-Factor Auth/)).toBeInTheDocument();
      expect(screen.getByText(/Dark Mode/)).toBeInTheDocument();
    });

    it('should advance to decisions step when button clicked', async () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      const makeDecisionsButton = screen.getByText('Make Decisions');
      fireEvent.click(makeDecisionsButton);

      await waitFor(() => {
        expect(screen.getByText('Make your decisions')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Decisions Input', () => {
    it('should render decisions textarea and examples', async () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Advance to decisions step
      fireEvent.click(screen.getByText('Make Decisions'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/I want... I don't want.../)).toBeInTheDocument();
        expect(screen.getByText(/I want the OAuth and dark mode/)).toBeInTheDocument();
      });
    });

    it('should allow user to input decisions', async () => {
      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Make Decisions'));

      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth and Dark Mode');

      expect(textarea).toHaveValue('I want OAuth and Dark Mode');
    });

    it('should submit decisions and advance to confirmation', async () => {
      const mockParsedDecisions = {
        accepted: mockTopicGroups[0].ideas.concat(mockTopicGroups[1].ideas),
        rejected: [],
        unmarked: [],
        confidence: 90,
        needsClarification: false,
      };

      mockOnSubmitDecisions.mockResolvedValue(mockParsedDecisions);

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to decisions
      fireEvent.click(screen.getByText('Make Decisions'));

      // Input decisions
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want all ideas');

      // Submit
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      // Verify API called
      await waitFor(() => {
        expect(mockOnSubmitDecisions).toHaveBeenCalledWith('I want all ideas');
      });

      // Should advance to confirmation
      await waitFor(() => {
        expect(screen.getByText(/final confirmation/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to summary when back button clicked', async () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Go to decisions
      fireEvent.click(screen.getByText('Make Decisions'));

      await waitFor(() => {
        expect(screen.getByText('Make your decisions')).toBeInTheDocument();
      });

      // Click back
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Review all ideas discussed')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Clarification (Conditional)', () => {
    it('should show clarification step when needed', async () => {
      const mockParsedDecisions = {
        accepted: [mockTopicGroups[0].ideas[0]],
        rejected: [],
        unmarked: [mockTopicGroups[0].ideas[1], mockTopicGroups[1].ideas[0]],
        confidence: 60,
        needsClarification: true,
        clarificationQuestion: 'What about Two-Factor Auth and Dark Mode?',
      };

      mockOnSubmitDecisions.mockResolvedValue(mockParsedDecisions);

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to decisions
      fireEvent.click(screen.getByText('Make Decisions'));

      // Input and submit
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth');
      fireEvent.click(screen.getByText('Submit'));

      // Should show clarification
      await waitFor(() => {
        expect(screen.getByText('What about Two-Factor Auth and Dark Mode?')).toBeInTheDocument();
      });
    });

    it('should allow clarification input and resubmit', async () => {
      const initialDecisions = {
        accepted: [mockTopicGroups[0].ideas[0]],
        rejected: [],
        unmarked: [mockTopicGroups[0].ideas[1]],
        confidence: 60,
        needsClarification: true,
        clarificationQuestion: 'What about Two-Factor Auth?',
      };

      const clarifiedDecisions = {
        accepted: mockTopicGroups[0].ideas,
        rejected: [],
        unmarked: [],
        confidence: 95,
        needsClarification: false,
      };

      mockOnSubmitDecisions
        .mockResolvedValueOnce(initialDecisions)
        .mockResolvedValueOnce(clarifiedDecisions);

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate and submit initial
      fireEvent.click(screen.getByText('Make Decisions'));
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth');
      fireEvent.click(screen.getByText('Submit'));

      // Wait for clarification
      await waitFor(() => {
        expect(screen.getByText('What about Two-Factor Auth?')).toBeInTheDocument();
      });

      // Input clarification
      const clarificationTextarea = await screen.findByPlaceholderText(/Clarify your decisions.../);
      await user.type(clarificationTextarea, 'Accept Two-Factor Auth too');
      fireEvent.click(screen.getAllByText('Submit')[0]);

      // Should advance to confirmation
      await waitFor(() => {
        expect(screen.getByText(/final confirmation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 4: Confirmation', () => {
    it('should display accepted and rejected ideas correctly', async () => {
      const mockParsedDecisions = {
        accepted: [mockTopicGroups[0].ideas[0], mockTopicGroups[1].ideas[0]],
        rejected: [mockTopicGroups[0].ideas[1]],
        unmarked: [],
        confidence: 95,
        needsClarification: false,
      };

      mockOnSubmitDecisions.mockResolvedValue(mockParsedDecisions);

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to decisions
      fireEvent.click(screen.getByText('Make Decisions'));

      // Submit decisions
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth and Dark Mode. Reject 2FA.');
      fireEvent.click(screen.getByText('Submit'));

      // Verify confirmation display
      await waitFor(() => {
        expect(screen.getByText(/Accepted \(2\)/)).toBeInTheDocument();
        expect(screen.getByText(/Rejected \(1\)/)).toBeInTheDocument();
        expect(screen.getByText('OAuth Support')).toBeInTheDocument();
        expect(screen.getByText('Dark Mode')).toBeInTheDocument();
        expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument();
      });
    });

    it('should finalize session when confirmed', async () => {
      const mockParsedDecisions = {
        accepted: [mockTopicGroups[0].ideas[0]],
        rejected: [mockTopicGroups[0].ideas[1]],
        unmarked: [],
        confidence: 95,
        needsClarification: false,
      };

      mockOnSubmitDecisions.mockResolvedValue(mockParsedDecisions);
      mockOnConfirmFinal.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate and submit
      fireEvent.click(screen.getByText('Make Decisions'));
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth. Reject 2FA.');
      fireEvent.click(screen.getByText('Submit'));

      // Wait for confirmation
      await waitFor(() => {
        expect(screen.getByText('Finalize Session')).toBeInTheDocument();
      });

      // Click finalize
      fireEvent.click(screen.getByText('Finalize Session'));

      // Verify finalization called
      await waitFor(() => {
        expect(mockOnConfirmFinal).toHaveBeenCalledWith(mockParsedDecisions);
      });
    });

    it('should show loading state during finalization', async () => {
      const mockParsedDecisions = {
        accepted: [mockTopicGroups[0].ideas[0]],
        rejected: [],
        unmarked: [],
        confidence: 95,
        needsClarification: false,
      };

      mockOnSubmitDecisions.mockResolvedValue(mockParsedDecisions);
      mockOnConfirmFinal.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to confirmation
      fireEvent.click(screen.getByText('Make Decisions'));
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want OAuth');
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Finalize Session')).toBeInTheDocument();
      });

      // Click finalize
      fireEvent.click(screen.getByText('Finalize Session'));

      // Should show loading
      await waitFor(() => {
        expect(screen.getByText('Finalizing...')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should close when close button clicked', () => {
      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <SessionReviewModal
          isOpen={false}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle submission errors gracefully', async () => {
      mockOnSubmitDecisions.mockRejectedValue(new Error('API Error'));

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const user = userEvent.setup();

      render(
        <SessionReviewModal
          isOpen={true}
          onClose={mockOnClose}
          topicGroups={mockTopicGroups}
          summaryText={mockSummaryText}
          onSubmitDecisions={mockOnSubmitDecisions}
          onConfirmFinal={mockOnConfirmFinal}
          onCancel={mockOnCancel}
        />
      );

      // Navigate and submit
      fireEvent.click(screen.getByText('Make Decisions'));
      const textarea = await screen.findByPlaceholderText(/I want... I don't want.../);
      await user.type(textarea, 'I want everything');
      fireEvent.click(screen.getByText('Submit'));

      // Should show alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse decisions'));
      });

      alertSpy.mockRestore();
    });
  });
});
