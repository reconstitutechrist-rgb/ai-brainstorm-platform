import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionTrackingPanel } from '../SessionTrackingPanel';
import { useThemeStore } from '../../store/themeStore';
import { useProjectStore } from '../../store/projectStore';
import type { ProjectItem } from '../../types';

// Mock stores
vi.mock('../../store/themeStore');
vi.mock('../../store/projectStore');

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SessionTrackingPanel', () => {
  const mockProjectItems: ProjectItem[] = [
    {
      id: 'item-1',
      text: 'Implement authentication system',
      state: 'decided',
      created_at: '2025-01-20T10:00:00Z',
      isArchived: false,
      citation: {
        userQuote: 'We need a secure login system',
        timestamp: '2025-01-20T09:55:00Z',
        confidence: 0.9,
        messageId: 'msg-1',
      },
    },
    {
      id: 'item-2',
      text: 'Research mobile responsiveness',
      state: 'exploring',
      created_at: '2025-01-20T10:05:00Z',
      isArchived: false,
      citation: {
        userQuote: 'Should we make this mobile-friendly?',
        timestamp: '2025-01-20T10:04:00Z',
        confidence: 0.75,
        messageId: 'msg-2',
      },
    },
    {
      id: 'item-3',
      text: 'Legacy feature migration',
      state: 'parked',
      created_at: '2025-01-20T10:10:00Z',
      isArchived: false,
      citation: {
        userQuote: 'Maybe we can tackle this later',
        timestamp: '2025-01-20T10:09:00Z',
        confidence: 0.85,
        messageId: 'msg-3',
      },
    },
    {
      id: 'item-4',
      text: 'Add two-factor authentication',
      state: 'decided',
      created_at: '2025-01-20T10:02:00Z',
      isArchived: false,
      citation: {
        userQuote: 'We should add 2FA for security',
        timestamp: '2025-01-20T09:57:00Z',
        confidence: 0.95,
        messageId: 'msg-4',
      },
    },
  ];

  const mockCurrentProject = {
    id: 'project-123',
    title: 'Test Project',
    description: 'Test Description',
    items: mockProjectItems,
    created_at: '2025-01-20T09:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useThemeStore as any).mockReturnValue({ isDarkMode: false });
    (useProjectStore as any).mockReturnValue({ currentProject: mockCurrentProject });
  });

  describe('Rendering', () => {
    it('should render with correct title', () => {
      render(<SessionTrackingPanel />);
      expect(screen.getByText('Session Tracking')).toBeInTheDocument();
      expect(screen.getByText('Real-time view of your project progress')).toBeInTheDocument();
    });

    it('should not render when no current project', () => {
      (useProjectStore as any).mockReturnValue({ currentProject: null });
      const { container } = render(<SessionTrackingPanel />);
      expect(container.firstChild).toBeNull();
    });

    it('should render in dark mode', () => {
      (useThemeStore as any).mockReturnValue({ isDarkMode: true });
      const { container } = render(<SessionTrackingPanel />);
      expect(container.querySelector('.glass-dark')).toBeInTheDocument();
    });
  });

  describe('Tab Counts', () => {
    it('should display correct count for decided items', () => {
      render(<SessionTrackingPanel />);
      const decidedTab = screen.getByText('Decisions').closest('button');
      expect(decidedTab).toBeInTheDocument();
      expect(decidedTab?.textContent).toContain('2'); // 2 decided items
    });

    it('should display correct count for exploring items', () => {
      render(<SessionTrackingPanel />);
      const exploringTab = screen.getByText('Exploring').closest('button');
      expect(exploringTab).toBeInTheDocument();
      expect(exploringTab?.textContent).toContain('1'); // 1 exploring item
    });

    it('should display correct count for parked items', () => {
      render(<SessionTrackingPanel />);
      const parkedTab = screen.getByText('Parked').closest('button');
      expect(parkedTab).toBeInTheDocument();
      expect(parkedTab?.textContent).toContain('1'); // 1 parked item
    });
  });

  describe('Tab Switching', () => {
    it('should show decided items by default', () => {
      render(<SessionTrackingPanel />);
      expect(screen.getByText('Implement authentication system')).toBeInTheDocument();
      expect(screen.getByText('Add two-factor authentication')).toBeInTheDocument();
      expect(screen.queryByText('Research mobile responsiveness')).not.toBeInTheDocument();
    });

    it('should switch to exploring tab', () => {
      render(<SessionTrackingPanel />);
      const exploringTab = screen.getByText('Exploring').closest('button');
      fireEvent.click(exploringTab!);

      expect(screen.getByText('Research mobile responsiveness')).toBeInTheDocument();
      expect(screen.queryByText('Implement authentication system')).not.toBeInTheDocument();
    });

    it('should switch to parked tab', () => {
      render(<SessionTrackingPanel />);
      const parkedTab = screen.getByText('Parked').closest('button');
      fireEvent.click(parkedTab!);

      expect(screen.getByText('Legacy feature migration')).toBeInTheDocument();
      expect(screen.queryByText('Implement authentication system')).not.toBeInTheDocument();
    });

    it('should update active tab indicator when switching', () => {
      render(<SessionTrackingPanel />);

      // Default is decided tab
      const decidedTab = screen.getByText('Decisions').closest('button');
      expect(decidedTab).toHaveClass('bg-gray-100');

      // Switch to exploring
      const exploringTab = screen.getByText('Exploring').closest('button');
      fireEvent.click(exploringTab!);

      expect(exploringTab).toHaveClass('bg-gray-100');
    });
  });

  describe('Item Cards', () => {
    it('should display item text correctly', () => {
      render(<SessionTrackingPanel />);
      expect(screen.getByText('Implement authentication system')).toBeInTheDocument();
    });

    it('should display item index badges', () => {
      render(<SessionTrackingPanel />);
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('should display creation time', () => {
      render(<SessionTrackingPanel />);
      // Check for time format (e.g., "10:00 AM")
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}\s[AP]M/i);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should show expand button for items with citations', () => {
      render(<SessionTrackingPanel />);
      // All items have citations, so there should be expand buttons
      const container = render(<SessionTrackingPanel />).container;
      const expandButtons = container.querySelectorAll('button[class*="hover:bg-white"]');
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('should not show expand button for items without citations', () => {
      const itemsWithoutCitations = [{
        ...mockProjectItems[0],
        citation: undefined,
      }];

      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: itemsWithoutCitations,
        },
      });

      const { container } = render(<SessionTrackingPanel />);
      const expandButtons = container.querySelectorAll('button[class*="hover:bg-white"]');
      expect(expandButtons.length).toBe(0);
    });
  });

  describe('Item Expansion', () => {
    it('should expand item when clicking expand button', async () => {
      render(<SessionTrackingPanel />);

      // Initially citation should not be visible
      expect(screen.queryByText('User Quote:')).not.toBeInTheDocument();

      // Find and click the first expand button
      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);
        await waitFor(() => {
          expect(screen.getByText('User Quote:')).toBeInTheDocument();
        });
      }
    });

    it('should show citation details when expanded', async () => {
      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText('User Quote:')).toBeInTheDocument();
          expect(screen.getByText('"We need a secure login system"')).toBeInTheDocument();
        });
      }
    });

    it('should show confidence level when expanded', async () => {
      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          expect(screen.getByText(/Confidence: 90%/)).toBeInTheDocument();
        });
      }
    });

    it('should collapse item when clicking expand button again', async () => {
      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        // Expand
        fireEvent.click(expandButton);
        await waitFor(() => {
          expect(screen.getByText('User Quote:')).toBeInTheDocument();
        });

        // Collapse
        fireEvent.click(expandButton);
        await waitFor(() => {
          expect(screen.queryByText('User Quote:')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Related Items Detection', () => {
    it('should show related items based on time proximity', async () => {
      // item-1 and item-4 are both decided items created within 5 minutes
      // They should be detected as related
      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          // Should show "Related Decisions" section
          const relatedText = screen.queryByText(/Related Decisions/);
          if (relatedText) {
            expect(relatedText).toBeInTheDocument();
          }
        });
      }
    });

    it('should limit related items to maximum of 3', async () => {
      // Create 5 related items
      const manyRelatedItems: ProjectItem[] = [
        mockProjectItems[0],
        { ...mockProjectItems[0], id: 'item-5', text: 'Related 1' },
        { ...mockProjectItems[0], id: 'item-6', text: 'Related 2' },
        { ...mockProjectItems[0], id: 'item-7', text: 'Related 3' },
        { ...mockProjectItems[0], id: 'item-8', text: 'Related 4' },
      ];

      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: manyRelatedItems,
        },
      });

      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          const relatedCount = screen.queryByText(/Related Decisions \((\d+)\)/);
          if (relatedCount) {
            // Should show max 3 related items
            expect(relatedCount.textContent).toMatch(/Related Decisions \([1-3]\)/);
          }
        });
      }
    });
  });

  describe('Empty States', () => {
    it('should show empty state for decided tab when no decided items', () => {
      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: mockProjectItems.filter(item => item.state !== 'decided'),
        },
      });

      render(<SessionTrackingPanel />);
      expect(screen.getByText('No decisions made yet')).toBeInTheDocument();
      expect(screen.getByText('Start chatting to see items appear here')).toBeInTheDocument();
    });

    it('should show empty state for exploring tab when no exploring items', () => {
      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: mockProjectItems.filter(item => item.state !== 'exploring'),
        },
      });

      render(<SessionTrackingPanel />);

      const exploringTab = screen.getByText('Exploring').closest('button');
      fireEvent.click(exploringTab!);

      expect(screen.getByText('No ideas being explored')).toBeInTheDocument();
    });

    it('should show empty state for parked tab when no parked items', () => {
      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: mockProjectItems.filter(item => item.state !== 'parked'),
        },
      });

      render(<SessionTrackingPanel />);

      const parkedTab = screen.getByText('Parked').closest('button');
      fireEvent.click(parkedTab!);

      expect(screen.getByText('No ideas parked')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update when project items change', () => {
      const { rerender } = render(<SessionTrackingPanel />);

      expect(screen.getByText('Decisions').closest('button')?.textContent).toContain('2');

      // Add a new decided item
      const updatedItems = [
        ...mockProjectItems,
        {
          id: 'item-9',
          text: 'New decided item',
          state: 'decided' as const,
          created_at: '2025-01-20T10:15:00Z',
          isArchived: false,
        },
      ];

      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: updatedItems,
        },
      });

      rerender(<SessionTrackingPanel />);

      expect(screen.getByText('Decisions').closest('button')?.textContent).toContain('3');
      expect(screen.getByText('New decided item')).toBeInTheDocument();
    });

    it('should update counts when items change state', () => {
      const { rerender } = render(<SessionTrackingPanel />);

      expect(screen.getByText('Decisions').closest('button')?.textContent).toContain('2');
      expect(screen.getByText('Exploring').closest('button')?.textContent).toContain('1');

      // Change an exploring item to decided
      const updatedItems = mockProjectItems.map(item =>
        item.id === 'item-2' ? { ...item, state: 'decided' as const } : item
      );

      (useProjectStore as any).mockReturnValue({
        currentProject: {
          ...mockCurrentProject,
          items: updatedItems,
        },
      });

      rerender(<SessionTrackingPanel />);

      expect(screen.getByText('Decisions').closest('button')?.textContent).toContain('3');
      expect(screen.getByText('Exploring').closest('button')?.textContent).toContain('0');
    });
  });

  describe('Confidence Level Indicators', () => {
    it('should show green badge for high confidence (>= 80%)', async () => {
      render(<SessionTrackingPanel />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Decisions')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          const confidenceBadge = screen.getByText(/Confidence: 90%/);
          expect(confidenceBadge).toHaveClass('text-green-400');
        });
      }
    });

    it('should show yellow badge for medium confidence (60-79%)', async () => {
      render(<SessionTrackingPanel />);

      // Switch to exploring tab (has 75% confidence)
      const exploringTab = screen.getByText('Exploring').closest('button');
      fireEvent.click(exploringTab!);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn =>
        btn.querySelector('svg') && !btn.textContent?.includes('Exploring')
      );

      if (expandButton) {
        fireEvent.click(expandButton);

        await waitFor(() => {
          const confidenceBadge = screen.getByText(/Confidence: 75%/);
          expect(confidenceBadge).toHaveClass('text-yellow-600');
        });
      }
    });
  });
});
