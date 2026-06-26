import { describe, it, expect } from 'vitest';
import { CommitmentPolicy } from '../CommitmentPolicy';
import { Commitment } from '../types';

describe('CommitmentPolicy Unit Tests', () => {
  const mockCommitment: Commitment = {
    id: 'c1',
    userId: 'user-123',
    title: 'Test',
    description: '',
    dueDate: '2026-07-01',
    priority: 'medium',
    status: 'active',
    createdAt: '',
    progressPercentage: 50,
    completedTasksCount: 2,
    totalTasksCount: 4,
    overallConfidence: 94,
    strategy: { title: '', description: '', milestones: [] },
  };

  it('verifies owner access correctly', () => {
    expect(CommitmentPolicy.isOwner(mockCommitment, 'user-123')).toBe(true);
    expect(CommitmentPolicy.isOwner(mockCommitment, 'user-999')).toBe(false);
  });

  it('permits same status transition targets', () => {
    expect(CommitmentPolicy.isTransitionAllowed('active', 'active')).toBe(true);
    expect(CommitmentPolicy.isTransitionAllowed('completed', 'completed')).toBe(true);
  });

  it('permits transitions from active to completed or failed', () => {
    expect(CommitmentPolicy.isTransitionAllowed('active', 'completed')).toBe(true);
    expect(CommitmentPolicy.isTransitionAllowed('active', 'failed')).toBe(true);
  });

  it('strictly rejects transitions from terminal states', () => {
    expect(CommitmentPolicy.isTransitionAllowed('completed', 'active')).toBe(false);
    expect(CommitmentPolicy.isTransitionAllowed('failed', 'active')).toBe(false);
  });

  it('specifies the correct archiving status', () => {
    expect(CommitmentPolicy.getArchivedStatus()).toBe('completed');
  });
});
