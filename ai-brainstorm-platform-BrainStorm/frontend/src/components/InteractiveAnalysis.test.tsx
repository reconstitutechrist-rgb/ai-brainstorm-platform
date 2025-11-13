/**
 * Unit tests for InteractiveAnalysis component
 * Tests interactive analysis UI and functionality
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InteractiveAnalysis from './InteractiveAnalysis';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('InteractiveAnalysis Component', () => {
  const defaultProps = {
    referenceId: 'ref_123',
    projectId: 'proj_456',
    analysisContent: `
## Key Features
- Feature 1
- Feature 2

## Technical Details
Technical information here
    `,
    onExtractToCanvas: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with chat tab active by default', () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      expect(screen.getByText('Ask Questions')).toBeInTheDocument();
      expect(screen.getByText('Key Insights')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask a question/i)).toBeInTheDocument();
    });

    it('should render empty state in chat tab', () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      expect(screen.getByText('Ask Questions About This Analysis')).toBeInTheDocument();
      expect(screen.getByText('Get clarification, explore details, or discover insights')).toBeInTheDocument();
    });

    it('should render suggested questions', () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      expect(screen.getByText('What are the key technologies mentioned?')).toBeInTheDocument();
      expect(screen.getByText('What are the main pain points?')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<InteractiveAnalysis {...defaultProps} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Tab Switching', () => {
    it('should switch to insights tab when clicked', async () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      const insightsTab = screen.getByText('Key Insights');
      fireEvent.click(insightsTab);

      await waitFor(() => {
        expect(screen.getByText('Analysis Sections')).toBeInTheDocument();
      });
    });

    it('should switch back to chat tab', async () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      const insightsTab = screen.getByText('Key Insights');
      fireEvent.click(insightsTab);

      await waitFor(() => {
        expect(screen.getByText('Analysis Sections')).toBeInTheDocument();
      });

      const chatTab = screen.getByText('Ask Questions');
      fireEvent.click(chatTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/i)).toBeInTheDocument();
      });
    });

    it('should highlight active tab', () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      const chatTab = screen.getByText('Ask Questions').closest('button');
      expect(chatTab).toHaveClass('bg-blue-600', 'text-white');
    });
  });

  describe('Chat Functionality', () => {
    it('should send message when form is submitted', async () => {
      const mockResponse = {
        data: {
          success: true,
          answer: 'AI response to your question',
          suggestedQuestions: ['Follow-up 1', 'Follow-up 2'],
        },
      };
      (api.post as Mock).mockResolvedValue(mockResponse);

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i);
      const user = userEvent.setup();

      await user.type(input, 'What is this about?');

      // Wait for button to be enabled
      const sendButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Send message' });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/api/analysis/chat', expect.objectContaining({
          referenceId: 'ref_123',
          projectId: 'proj_456',
          question: 'What is this about?',
        }));
      });
    });

    it('should display user message immediately', async () => {
      const mockResponse = {
        data: {
          success: true,
          answer: 'AI response',
          suggestedQuestions: [],
        },
      };
      (api.post as Mock).mockResolvedValue(mockResponse);

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i);
      const user = userEvent.setup();

      await user.type(input, 'Test question');

      const sendButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Send message' });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test question')).toBeInTheDocument();
      });
    });

    it('should display AI response', async () => {
      const mockResponse = {
        data: {
          success: true,
          answer: 'This is the AI response',
          suggestedQuestions: [],
        },
      };
      (api.post as Mock).mockResolvedValue(mockResponse);

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i);
      const user = userEvent.setup();

      await user.type(input, 'Question');

      const sendButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Send message' });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('This is the AI response')).toBeInTheDocument();
      });
    });

    it('should clear input after sending message', async () => {
      const mockResponse = {
        data: {
          success: true,
          answer: 'Response',
          suggestedQuestions: [],
        },
      };
      (api.post as Mock).mockResolvedValue(mockResponse);

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i) as HTMLInputElement;
      const user = userEvent.setup();

      await user.type(input, 'Question');

      const sendButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Send message' });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should handle API errors gracefully', async () => {
      (api.post as Mock).mockRejectedValue(new Error('Network error'));

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i);
      const user = userEvent.setup();

      await user.type(input, 'Question');

      const sendButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Send message' });
        expect(btn).not.toBeDisabled();
        return btn;
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/i)).toBeInTheDocument();
      });
    });

    it('should not send empty messages', async () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      fireEvent.click(sendButton);

      expect(api.post).not.toHaveBeenCalled();
    });

    it('should disable input while loading', async () => {
      (api.post as Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<InteractiveAnalysis {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask a question/i);
      const user = userEvent.setup();

      await user.type(input, 'Question');
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(input).toBeDisabled();
    });
  });

  describe('Insights Tab', () => {
    it('should parse and display sections', () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      fireEvent.click(screen.getByText('Key Insights'));

      expect(screen.getByText('Key Features')).toBeInTheDocument();
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });

    it('should handle deep-dive request', async () => {
      const mockResponse = {
        data: {
          success: true,
          expandedContent: 'Detailed analysis...',
          researchSuggestions: [],
        },
      };
      (api.post as Mock).mockResolvedValue(mockResponse);

      render(<InteractiveAnalysis {...defaultProps} />);

      fireEvent.click(screen.getByText('Key Insights'));

      // Find and click the expand button for the "Key Features" section
      const expandButton = screen.getByRole('button', { name: /Toggle Key Features section/i });
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/api/analysis/deep-dive', expect.objectContaining({
          sectionTitle: 'Key Features',
        }));
      });
    });

    it('should call onExtractToCanvas when extract button is clicked', () => {
      const onExtractToCanvas = vi.fn();
      render(<InteractiveAnalysis {...defaultProps} onExtractToCanvas={onExtractToCanvas} />);

      fireEvent.click(screen.getByText('Key Insights'));

      // Find and click an extract button
      const buttons = screen.getAllByRole('button');
      const extractButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.title === 'Add to Canvas';
      });

      if (extractButton) {
        fireEvent.click(extractButton);
        expect(onExtractToCanvas).toHaveBeenCalled();
      }
    });

    it('should show extracted insights count in tab', async () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      fireEvent.click(screen.getByText('Key Insights'));

      // Extract an insight
      const buttons = screen.getAllByRole('button');
      const extractButton = buttons.find(btn => btn.title === 'Add to Canvas');

      if (extractButton) {
        fireEvent.click(extractButton);

        await waitFor(() => {
          expect(screen.getByText('1')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Suggested Questions', () => {
    it('should populate input when suggested question is clicked', async () => {
      render(<InteractiveAnalysis {...defaultProps} />);

      const suggestedQuestion = screen.getByText('What are the key technologies mentioned?');
      fireEvent.click(suggestedQuestion);

      const input = screen.getByPlaceholderText(/Ask a question/i) as HTMLInputElement;
      expect(input.value).toBe('What are the key technologies mentioned?');
    });
  });
});
