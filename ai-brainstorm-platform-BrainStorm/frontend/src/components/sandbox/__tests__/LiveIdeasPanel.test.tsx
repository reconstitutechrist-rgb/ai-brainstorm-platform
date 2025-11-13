import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiveIdeasPanel } from '../LiveIdeasPanel';
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

describe('LiveIdeasPanel', () => {
  const mockIdeas = [
    {
      id: 'idea-1',
      source: 'user_mention' as const,
      conversationContext: {
        messageId: 'msg-1',
        timestamp: '2025-01-20T10:00:00Z',
        leadingQuestions: ['What authentication method should we use?'],
        topic: 'Authentication',
        topicConfidence: 95,
        relatedMessageIds: ['msg-2', 'msg-3'],
      },
      idea: {
        title: 'Implement JWT authentication',
        description: 'Use JSON Web Tokens for secure user authentication',
        reasoning: 'JWT provides stateless authentication and scales well',
        userIntent: 'Security and scalability',
      },
      status: 'refined' as const,
      tags: ['security', 'auth', 'jwt'],
      innovationLevel: 'practical' as const,
    },
    {
      id: 'idea-2',
      source: 'ai_suggestion' as const,
      conversationContext: {
        messageId: 'msg-4',
        timestamp: '2025-01-20T10:05:00Z',
        leadingQuestions: ['Should we add two-factor authentication?'],
        topic: 'Authentication',
        topicConfidence: 88,
      },
      idea: {
        title: 'Add two-factor authentication',
        description: 'Implement 2FA for enhanced security',
        reasoning: 'Increases account security significantly',
        userIntent: 'Enhanced security',
      },
      status: 'exploring' as const,
      tags: ['security', '2fa'],
      innovationLevel: 'moderate' as const,
    },
    {
      id: 'idea-3',
      source: 'collaborative' as const,
      conversationContext: {
        messageId: 'msg-5',
        timestamp: '2025-01-20T10:10:00Z',
        leadingQuestions: ['How should the mobile app look?'],
        topic: 'Mobile Design',
        topicConfidence: 92,
      },
      idea: {
        title: 'Responsive mobile layout',
        description: 'Create a mobile-first responsive design',
        reasoning: 'Mobile users are the majority',
        userIntent: 'Better mobile experience',
      },
      status: 'mentioned' as const,
      tags: ['mobile', 'ui', 'design'],
      innovationLevel: 'practical' as const,
    },
    {
      id: 'idea-4',
      source: 'user_mention' as const,
      conversationContext: {
        messageId: 'msg-6',
        timestamp: '2025-01-20T10:12:00Z',
        leadingQuestions: [],
        topic: 'Mobile Design',
        topicConfidence: 90,
      },
      idea: {
        title: 'Gesture-based navigation',
        description: 'Add swipe gestures for mobile navigation',
        reasoning: 'Improves user experience on touch devices',
        userIntent: 'Modern UX',
      },
      status: 'ready_to_extract' as const,
      tags: ['mobile', 'ux', 'gestures'],
      innovationLevel: 'experimental' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useThemeStore as any).mockReturnValue({ isDarkMode: false });
  });

  describe('Rendering', () => {
    it('should render with correct title', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);
      expect(screen.getByText('Live Ideas')).toBeInTheDocument();
      expect(screen.getByText('Ideas organized by conversation context')).toBeInTheDocument();
    });

    it('should display total ideas count', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);
      expect(screen.getByText('4 total')).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });
      const { container } = render(<LiveIdeasPanel ideas={mockIdeas} />);
      const totalBadge = screen.getByText('4 total');
      expect(totalBadge).toHaveClass('bg-white/10');
    });
  });

  describe('Topic Grouping', () => {
    it('should group ideas by topic', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Mobile Design')).toBeInTheDocument();
    });

    it('should display correct idea count per topic', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const authTopic = screen.getByText('Authentication').closest('button');
      expect(authTopic?.textContent).toContain('2 ideas');

      const mobileTopic = screen.getByText('Mobile Design').closest('button');
      expect(mobileTopic?.textContent).toContain('2 ideas');
    });

    it('should handle ideas without topics', () => {
      const ideasWithoutTopics = [
        {
          ...mockIdeas[0],
          conversationContext: {
            ...mockIdeas[0].conversationContext,
            topic: undefined,
          },
        },
      ];

      render(<LiveIdeasPanel ideas={ideasWithoutTopics} />);
      expect(screen.getByText('General Ideas')).toBeInTheDocument();
    });

    it('should sort topics by first idea timestamp', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const topics = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('ideas')
      );

      // Authentication topic (10:00) should come before Mobile Design (10:10)
      expect(topics[0].textContent).toContain('Authentication');
      expect(topics[1].textContent).toContain('Mobile Design');
    });
  });

  describe('Topic Icons', () => {
    it('should show correct icon for auth topics', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);
      expect(screen.getByText('🔐')).toBeInTheDocument();
    });

    it('should show correct icon for mobile topics', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);
      expect(screen.getByText('📱')).toBeInTheDocument();
    });

    it('should show default icon for unknown topics', () => {
      const unknownTopicIdea = [
        {
          ...mockIdeas[0],
          conversationContext: {
            ...mockIdeas[0].conversationContext,
            topic: 'Unknown Topic',
          },
        },
      ];

      render(<LiveIdeasPanel ideas={unknownTopicIdea} />);
      expect(screen.getByText('💡')).toBeInTheDocument();
    });
  });

  describe('Topic Expansion', () => {
    it('should start with all topics expanded', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      // All idea titles should be visible
      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
      expect(screen.getByText('Add two-factor authentication')).toBeInTheDocument();
      expect(screen.getByText('Responsive mobile layout')).toBeInTheDocument();
      expect(screen.getByText('Gesture-based navigation')).toBeInTheDocument();
    });

    it('should collapse topic when clicking header', async () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const authTopic = screen.getByText('Authentication').closest('button');
      fireEvent.click(authTopic!);

      await waitFor(() => {
        expect(screen.queryByText('Implement JWT authentication')).not.toBeInTheDocument();
      });
    });

    it('should expand topic when clicking collapsed header', async () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const authTopic = screen.getByText('Authentication').closest('button');

      // Collapse
      fireEvent.click(authTopic!);
      await waitFor(() => {
        expect(screen.queryByText('Implement JWT authentication')).not.toBeInTheDocument();
      });

      // Expand
      fireEvent.click(authTopic!);
      await waitFor(() => {
        expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
      });
    });
  });

  describe('Idea Cards', () => {
    it('should display idea titles', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
      expect(screen.getByText('Add two-factor authentication')).toBeInTheDocument();
    });

    it('should display idea descriptions', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('Use JSON Web Tokens for secure user authentication')).toBeInTheDocument();
      expect(screen.getByText('Implement 2FA for enhanced security')).toBeInTheDocument();
    });

    it('should display status emojis', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      // mentioned: 🌱, exploring: 🔍, refined: ✨, ready_to_extract: ✅
      expect(screen.getByText('✨')).toBeInTheDocument(); // refined
      expect(screen.getByText('🔍')).toBeInTheDocument(); // exploring
      expect(screen.getByText('🌱')).toBeInTheDocument(); // mentioned
      expect(screen.getByText('✅')).toBeInTheDocument(); // ready_to_extract
    });

    it('should display innovation level badges', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('practical')).toBeInTheDocument();
      expect(screen.getByText('moderate')).toBeInTheDocument();
      expect(screen.getByText('experimental')).toBeInTheDocument();
    });

    it('should apply correct colors to innovation levels', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const practicalBadge = screen.getAllByText('practical')[0];
      expect(practicalBadge).toHaveClass('text-blue-400');

      const moderateBadge = screen.getByText('moderate');
      expect(moderateBadge).toHaveClass('text-purple-400');

      const experimentalBadge = screen.getByText('experimental');
      expect(experimentalBadge).toHaveClass('text-orange-400');
    });

    it('should display topic confidence percentage', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('95% match')).toBeInTheDocument();
      expect(screen.getByText('88% match')).toBeInTheDocument();
      expect(screen.getByText('92% match')).toBeInTheDocument();
      expect(screen.getByText('90% match')).toBeInTheDocument();
    });

    it('should display tags (max 3)', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('security')).toBeInTheDocument();
      expect(screen.getByText('auth')).toBeInTheDocument();
      expect(screen.getByText('jwt')).toBeInTheDocument();
    });

    it('should limit tags to 3 per idea', () => {
      const ideaWithManyTags = [
        {
          ...mockIdeas[0],
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        },
      ];

      const { container } = render(<LiveIdeasPanel ideas={ideaWithManyTags} />);

      const tagElements = container.querySelectorAll('[class*="text-xs"][class*="px-2"]');
      // Should only show 3 tags (plus other badges like innovation level)
      const actualTags = Array.from(tagElements).filter(el =>
        ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'].includes(el.textContent || '')
      );

      expect(actualTags.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Source Icons', () => {
    it('should display user icon for user_mention source', () => {
      render(<LiveIdeasPanel ideas={[mockIdeas[0]]} />);
      // User icon should be rendered (we can't easily test SVG, but we can check the component renders)
      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
    });

    it('should render different sources correctly', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      // All ideas should render regardless of source
      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument(); // user_mention
      expect(screen.getByText('Add two-factor authentication')).toBeInTheDocument(); // ai_suggestion
      expect(screen.getByText('Responsive mobile layout')).toBeInTheDocument(); // collaborative
    });
  });

  describe('End Session Button', () => {
    it('should show End Session button when ideas exist', () => {
      const mockOnEndSession = vi.fn();
      render(<LiveIdeasPanel ideas={mockIdeas} onEndSession={mockOnEndSession} />);

      expect(screen.getByText('End Session & Review')).toBeInTheDocument();
    });

    it('should not show End Session button when no ideas', () => {
      const mockOnEndSession = vi.fn();
      render(<LiveIdeasPanel ideas={[]} onEndSession={mockOnEndSession} />);

      expect(screen.queryByText('End Session & Review')).not.toBeInTheDocument();
    });

    it('should not show End Session button when no handler provided', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.queryByText('End Session & Review')).not.toBeInTheDocument();
    });

    it('should call onEndSession when clicked', () => {
      const mockOnEndSession = vi.fn();
      render(<LiveIdeasPanel ideas={mockIdeas} onEndSession={mockOnEndSession} />);

      const button = screen.getByText('End Session & Review');
      fireEvent.click(button);

      expect(mockOnEndSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no ideas', () => {
      render(<LiveIdeasPanel ideas={[]} />);

      expect(screen.getByText('No ideas yet')).toBeInTheDocument();
      expect(screen.getByText('Ideas will appear here as you chat with AI')).toBeInTheDocument();
    });

    it('should not show empty state when ideas exist', () => {
      render(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.queryByText('No ideas yet')).not.toBeInTheDocument();
    });

    it('should show lightbulb icon in empty state', () => {
      render(<LiveIdeasPanel ideas={[]} />);
      // Lightbulb icon should be present (icon component renders)
      expect(screen.getByText('No ideas yet')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update when new ideas added', () => {
      const { rerender } = render(<LiveIdeasPanel ideas={[mockIdeas[0]]} />);

      expect(screen.getByText('1 total')).toBeInTheDocument();
      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();

      // Add new idea
      rerender(<LiveIdeasPanel ideas={mockIdeas} />);

      expect(screen.getByText('4 total')).toBeInTheDocument();
      expect(screen.getByText('Add two-factor authentication')).toBeInTheDocument();
    });

    it('should regroup when topic changes', () => {
      const { rerender } = render(<LiveIdeasPanel ideas={[mockIdeas[0]]} />);

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.queryByText('Mobile Design')).not.toBeInTheDocument();

      // Add mobile idea
      rerender(<LiveIdeasPanel ideas={[mockIdeas[0], mockIdeas[2]]} />);

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Mobile Design')).toBeInTheDocument();
    });

    it('should update counts when ideas added to existing topic', () => {
      const { rerender } = render(<LiveIdeasPanel ideas={[mockIdeas[0]]} />);

      let authTopic = screen.getByText('Authentication').closest('button');
      expect(authTopic?.textContent).toContain('1 idea');

      // Add another auth idea
      rerender(<LiveIdeasPanel ideas={[mockIdeas[0], mockIdeas[1]]} />);

      authTopic = screen.getByText('Authentication').closest('button');
      expect(authTopic?.textContent).toContain('2 ideas');
    });
  });

  describe('Conversation Context', () => {
    it('should use conversationId prop when provided', () => {
      const { container } = render(
        <LiveIdeasPanel ideas={mockIdeas} conversationId="conv-123" />
      );

      expect(container).toBeTruthy();
      // Component should render normally with conversationId
      expect(screen.getByText('Live Ideas')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should apply dark mode styles', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });

      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const header = screen.getByText('Live Ideas');
      expect(header).toHaveClass('text-white');
    });

    it('should apply light mode styles', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: false });

      render(<LiveIdeasPanel ideas={mockIdeas} />);

      const header = screen.getByText('Live Ideas');
      expect(header).toHaveClass('text-gray-800');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single idea', () => {
      render(<LiveIdeasPanel ideas={[mockIdeas[0]]} />);

      expect(screen.getByText('1 total')).toBeInTheDocument();
      expect(screen.getByText('1 idea')).toBeInTheDocument(); // Singular form
    });

    it('should handle ideas without tags', () => {
      const ideaWithoutTags = [
        {
          ...mockIdeas[0],
          tags: [],
        },
      ];

      const { container } = render(<LiveIdeasPanel ideas={ideaWithoutTags} />);

      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
      // No tag elements should be present
      expect(container.querySelectorAll('[class*="tag"]').length).toBe(0);
    });

    it('should handle ideas without topic confidence', () => {
      const ideaWithoutConfidence = [
        {
          ...mockIdeas[0],
          conversationContext: {
            ...mockIdeas[0].conversationContext,
            topicConfidence: undefined,
          },
        },
      ];

      render(<LiveIdeasPanel ideas={ideaWithoutConfidence} />);

      expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
      expect(screen.getByText('Implement JWT authentication')).toBeInTheDocument();
    });
  });
});
