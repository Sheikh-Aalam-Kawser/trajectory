import { describe, it, expect } from 'vitest';
import { ProgressCalculator } from '../ProgressCalculator';
import { Commitment } from '../types';

describe('ProgressCalculator Unit Tests', () => {
  const createMockCommitment = (): Commitment => ({
    id: 'commitment-123',
    userId: 'user-456',
    title: 'Test Trajectory Path',
    description: 'Unit testing our core Domain Progress calculations',
    dueDate: '2026-07-15',
    priority: 'high',
    status: 'active',
    createdAt: new Date().toISOString(),
    progressPercentage: 0,
    completedTasksCount: 0,
    totalTasksCount: 0,
    overallConfidence: 94,
    strategy: {
      title: 'Strategy Title',
      description: 'Strategy Description',
      milestones: [
        {
          id: 'm1',
          title: 'Milestone 1',
          description: 'First stage of execution',
          targetDate: '2026-07-01',
          estimatedHours: 10,
          status: 'pending',
          createdAt: new Date().toISOString(),
          tasks: [
            {
              id: 't1-1',
              title: 'Task 1.1',
              status: 'pending',
              estimatedHours: 3,
              isCriticalPath: true,
              date: '2026-06-28',
            },
            {
              id: 't1-2',
              title: 'Task 1.2',
              status: 'pending',
              estimatedHours: 4,
              isCriticalPath: false,
              date: '2026-06-29',
            },
          ],
        },
        {
          id: 'm2',
          title: 'Milestone 2',
          description: 'Second stage of execution',
          targetDate: '2026-07-10',
          estimatedHours: 15,
          status: 'pending',
          createdAt: new Date().toISOString(),
          tasks: [
            {
              id: 't2-1',
              title: 'Task 2.1',
              status: 'pending',
              estimatedHours: 5,
              isCriticalPath: true,
              date: '2026-07-05',
            },
          ],
        },
      ],
    },
  });

  it('calculates metrics correctly for initial pending state', () => {
    const commitment = createMockCommitment();
    const result = ProgressCalculator.calculate(commitment);

    expect(result.totalTasksCount).toBe(3);
    expect(result.completedTasksCount).toBe(0);
    expect(result.progressPercentage).toBe(0);
    expect(result.overallConfidence).toBe(85); // 85% is the custom minimum baseline when no completions are present
    expect(result.strategy.milestones[0].status).toBe('pending');
    expect(result.strategy.milestones[1].status).toBe('pending');
  });

  it('handles partial completion with appropriate percentage and confidence updates', () => {
    const commitment = createMockCommitment();
    // Complete first task in Milestone 1
    commitment.strategy.milestones[0].tasks[0].status = 'completed';
    
    const result = ProgressCalculator.calculate(commitment);

    expect(result.totalTasksCount).toBe(3);
    expect(result.completedTasksCount).toBe(1);
    expect(result.progressPercentage).toBe(33); // 1 out of 3 ~ 33%
    expect(result.overallConfidence).toBe(90); // 85 + (1/3)*15 - 0 = 90
    expect(result.strategy.milestones[0].status).toBe('pending'); // milestone 1 not fully done
  });

  it('sets milestone status to completed when all its tasks are completed', () => {
    const commitment = createMockCommitment();
    commitment.strategy.milestones[0].tasks[0].status = 'completed';
    commitment.strategy.milestones[0].tasks[1].status = 'completed';

    const result = ProgressCalculator.calculate(commitment);

    expect(result.strategy.milestones[0].status).toBe('completed');
    expect(result.strategy.milestones[1].status).toBe('pending');
    expect(result.progressPercentage).toBe(67); // 2 out of 3 ~ 67%
  });

  it('preserves/updates delayed status for second milestone when active or partially completed', () => {
    const commitment = createMockCommitment();
    // Milestone 2 is at index 1. If any task is active or completed, mIdx === 1 gets marked as delayed
    commitment.strategy.milestones[1].tasks[0].status = 'in_progress';

    const result = ProgressCalculator.calculate(commitment);

    expect(result.strategy.milestones[1].status).toBe('delayed');
  });

  it('calculates skips correctly and reduces confidence representation gracefully', () => {
    const commitment = createMockCommitment();
    commitment.strategy.milestones[0].tasks[0].status = 'skipped';
    
    const result = ProgressCalculator.calculate(commitment);

    expect(result.completedTasksCount).toBe(0);
    expect(result.overallConfidence).toBe(78); // 85 + 0 - (1/3)*20 = 78
  });
});
