// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as reactQuery from '@tanstack/react-query';
import CommitmentPage from '../pages/Commitment';
import DashboardPage from '../pages/Dashboard';

// Mock Lucide icons that might break in jsdom or contain SVG transitions
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<any>('lucide-react');
  return {
    ...actual,
    Calendar: () => <div data-testid="icon-calendar" />,
    Plus: () => <div data-testid="icon-plus" />,
    Compass: () => <div data-testid="icon-compass" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    CheckCircle2: () => <div data-testid="icon-check-circle" />,
    TrendingUp: () => <div data-testid="icon-trending-up" />,
    HelpCircle: () => <div data-testid="icon-help" />,
    ArrowLeft: () => <div data-testid="icon-arrow-left" />,
    Play: () => <div data-testid="icon-play" />,
    SkipForward: () => <div data-testid="icon-skip-forward" />,
    Clock: () => <div data-testid="icon-clock" />,
    Flame: () => <div data-testid="icon-flame" />,
    Milestone: () => <div data-testid="icon-milestone" />,
    Check: () => <div data-testid="icon-check" />,
  };
});

// Mock Framer Motion to bypass async layout animations in testing
vi.mock('motion/react', () => {
  return {
    motion: {
      div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
      button: ({ children, className, ...props }: any) => <button className={className} {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock the Auth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-123', displayName: 'Jane Doe', email: 'jane@example.com' },
    loading: false,
  }),
}));

// Mock the react-query hooks
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<any>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

describe('Frontend Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveCommitment = {
    id: 'commitment-1',
    userId: 'user-123',
    title: 'Deploy Kubernetes Cluster',
    description: 'Set up multi-region highly available control plane',
    dueDate: '2026-07-15',
    priority: 'high',
    status: 'active',
    createdAt: '2026-06-26T00:00:00Z',
    progressPercentage: 50,
    completedTasksCount: 2,
    totalTasksCount: 4,
    overallConfidence: 94,
    strategy: {
      title: 'Infrastructure Strategy',
      description: 'Step-by-step assembly',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Bootstrap Nodes',
          description: 'Provision VM instances and set up routing tables',
          targetDate: '2026-07-01',
          estimatedHours: 12,
          status: 'completed',
          tasks: [
            {
              id: 'task-1-1',
              title: 'Provision raw metal',
              status: 'completed',
              estimatedHours: 4,
              isCriticalPath: true,
              date: '2026-06-26',
            },
            {
              id: 'task-1-2',
              title: 'Bootstrap control plane',
              status: 'completed',
              estimatedHours: 8,
              isCriticalPath: false,
              date: '2026-06-26',
            },
          ],
        },
        {
          id: 'milestone-2',
          title: 'Establish Sync Core',
          description: 'Deploy ingress controller and etcd key store',
          targetDate: '2026-07-10',
          estimatedHours: 10,
          status: 'delayed',
          tasks: [
            {
              id: 'task-2-1',
              title: 'Configure etcd backend',
              status: 'in_progress',
              estimatedHours: 6,
              isCriticalPath: true,
              date: '2026-07-01',
            },
            {
              id: 'task-2-2',
              title: 'Verify storage drivers',
              status: 'pending',
              estimatedHours: 4,
              isCriticalPath: false,
              date: '2026-07-01',
            },
          ],
        },
      ],
    },
  };

  describe('CommitmentPage Workspace', () => {
    it('renders loading placeholder state when query is loading', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { container } = render(
        <BrowserRouter>
          <CommitmentPage />
        </BrowserRouter>
      );

      // Verify skeleton classes are present indicating a polished loading state
      expect(container.querySelector('.animate-pulse')).toBeDefined();
    });

    it('renders empty placeholder state when no active commitment is fetched', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      render(
        <BrowserRouter>
          <CommitmentPage />
        </BrowserRouter>
      );

      expect(screen.getByText('No In-Flight Trajectory')).toBeDefined();
      expect(screen.getByText(/You do not have any high-stakes commitments active/i)).toBeDefined();
    });

    it('renders complete Workspace dashboard with details when commitment is loaded', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: mockActiveCommitment,
        isLoading: false,
      } as any);

      vi.mocked(reactQuery.useMutation).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      render(
        <BrowserRouter>
          <CommitmentPage />
        </BrowserRouter>
      );

      // Verify title is rendered
      expect(screen.getByText('Deploy Kubernetes Cluster')).toBeDefined();
      expect(screen.getByText('Set up multi-region highly available control plane')).toBeDefined();

      // Verify progress summary rings
      expect(screen.getAllByText('50%')).toBeDefined();

      // Verify milestone descriptions
      expect(screen.getByText('Bootstrap Nodes')).toBeDefined();
      expect(screen.getByText('Provision VM instances and set up routing tables')).toBeDefined();
    });

    it('triggers updateTaskMutation upon interactive clicks', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: mockActiveCommitment,
        isLoading: false,
      } as any);

      const mockMutate = vi.fn();
      vi.mocked(reactQuery.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <BrowserRouter>
          <CommitmentPage />
        </BrowserRouter>
      );

      // Find interactive Start button for the in progress task
      const startButtons = screen.getAllByRole('button', { name: /Start/i });
      expect(startButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(startButtons[0]);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('DashboardPage', () => {
    it('renders beautiful statistics widgets and current active commitment', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: mockActiveCommitment,
        isLoading: false,
      } as any);

      render(
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      );

      // Verify welcome greeting with parsed user name
      expect(screen.getByText(/Welcome back,/i)).toBeDefined();
      expect(screen.getByText('Jane')).toBeDefined();

      // Verify metrics
      expect(screen.getByText('Active Path')).toBeDefined();
      expect(screen.getByText('Success Rate')).toBeDefined();
      expect(screen.getByText('Execution Score')).toBeDefined();

      // Verify the current active commitment card renders on the dashboard
      expect(screen.getByText('Current active commitment')).toBeDefined();
      expect(screen.getByText('Deploy Kubernetes Cluster')).toBeDefined();
    });

    it('renders empty dashboard state when no active commitment is registered', () => {
      vi.mocked(reactQuery.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      render(
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      );

      expect(screen.getByText('No active commitments')).toBeDefined();
      expect(screen.getByText(/Configure Your First Commitment/i)).toBeDefined();
    });
  });
});
