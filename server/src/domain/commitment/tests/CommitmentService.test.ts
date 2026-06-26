import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommitmentService } from '../CommitmentService';
import { CommitmentRepository } from '../../../repositories/commitment.repository';
import { Commitment } from '../types';
import { PlanningAgentOutput } from '../../../agents/planning/types';

vi.mock('../../../repositories/commitment.repository', () => {
  return {
    CommitmentRepository: {
      getActive: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      save: vi.fn(),
      generateId: vi.fn(() => 'mock-generated-id'),
      archiveActiveCommitments: vi.fn(),
    },
  };
});

describe('CommitmentService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStrategyOutput: PlanningAgentOutput = {
    title: 'Kubernetes Strategy',
    description: 'Detailed strategy for provisioning and configuring K8s cluster',
    milestones: [
      {
        title: 'Bootstrap VM Nodes',
        description: 'Initialize nodes on cloud provider',
        targetDate: '2026-07-01',
        estimatedHours: 8,
      },
      {
        title: 'Configure Networking',
        description: 'Configure VPC and ingress controllers',
        targetDate: '2026-07-10',
        estimatedHours: 12,
      },
      {
        title: 'Deploy Storage Backend',
        description: 'Set up highly available storage classes',
        targetDate: '2026-07-20',
        estimatedHours: 10,
      },
    ],
  };

  const mockCommitment: Commitment = {
    id: 'mock-generated-id',
    userId: 'user-111',
    title: 'Launch K8s Project',
    description: 'Set up highly available nodes',
    dueDate: '2026-07-20',
    priority: 'high',
    status: 'active',
    createdAt: '2026-06-26T00:00:00Z',
    progressPercentage: 8,
    completedTasksCount: 1,
    totalTasksCount: 12,
    overallConfidence: 86,
    strategy: {
      title: 'Kubernetes Strategy',
      description: 'Detailed strategy for provisioning and configuring K8s cluster',
      milestones: [],
    },
  };

  it('getActive - retrieves active commitments from repo', async () => {
    vi.mocked(CommitmentRepository.getActive).mockResolvedValue(mockCommitment);

    const active = await CommitmentService.getActive('user-111');
    expect(active).toEqual(mockCommitment);
    expect(CommitmentRepository.getActive).toHaveBeenCalledWith('user-111');
  });

  it('getAll - retrieves all commitments from repo', async () => {
    vi.mocked(CommitmentRepository.getAll).mockResolvedValue([mockCommitment]);

    const all = await CommitmentService.getAll('user-111');
    expect(all).toEqual([mockCommitment]);
    expect(CommitmentRepository.getAll).toHaveBeenCalledWith('user-111');
  });

  it('create - handles workflow and calls repository to archive previous and save new', async () => {
    vi.mocked(CommitmentRepository.archiveActiveCommitments).mockResolvedValue(1);
    vi.mocked(CommitmentRepository.save).mockResolvedValue(undefined);

    const result = await CommitmentService.create(
      'user-111',
      'Launch K8s Project',
      'Set up highly available nodes',
      '2026-07-20',
      'high',
      mockStrategyOutput
    );

    expect(result.id).toBe('mock-generated-id');
    expect(result.userId).toBe('user-111');
    expect(result.status).toBe('active');
    expect(CommitmentRepository.archiveActiveCommitments).toHaveBeenCalledWith('user-111');
    expect(CommitmentRepository.save).toHaveBeenCalled();
  });

  it('updateTaskStatus - fails when commitment trajectory does not exist', async () => {
    vi.mocked(CommitmentRepository.getById).mockResolvedValue(null);

    await expect(
      CommitmentService.updateTaskStatus('user-111', 'invalid-id', 'task-id', 'completed')
    ).rejects.toThrow('Commitment trajectory not found');
  });

  it('updateTaskStatus - fails if user is not the owner', async () => {
    vi.mocked(CommitmentRepository.getById).mockResolvedValue(mockCommitment);

    await expect(
      CommitmentService.updateTaskStatus('user-999', 'mock-generated-id', 'task-id', 'completed')
    ).rejects.toThrow('Unauthorized database write access');
  });

  it('updateTaskStatus - mutates matching tasks, recalculates, and saves successfully', async () => {
    const commitmentWithMilestone: Commitment = {
      ...mockCommitment,
      strategy: {
        title: 'Strategy title',
        description: 'Strategy desc',
        milestones: [
          {
            id: 'm1',
            title: 'M1',
            description: 'M1 desc',
            targetDate: '2026-07-01',
            estimatedHours: 5,
            status: 'pending',
            createdAt: '2026-06-26T00:00:00Z',
            tasks: [
              {
                id: 'task-111',
                title: 'Task 1',
                status: 'pending',
                estimatedHours: 2,
                isCriticalPath: true,
                date: '2026-06-27',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(CommitmentRepository.getById).mockResolvedValue(commitmentWithMilestone);
    vi.mocked(CommitmentRepository.save).mockResolvedValue(undefined);

    const result = await CommitmentService.updateTaskStatus(
      'user-111',
      'mock-generated-id',
      'task-111',
      'completed'
    );

    expect(result.strategy.milestones[0].tasks![0].status).toBe('completed');
    expect(result.progressPercentage).toBe(100);
    expect(CommitmentRepository.save).toHaveBeenCalledWith(result);
  });
});
