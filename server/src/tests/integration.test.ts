import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import commitmentRouter from '../routes/commitment.routes';
import { CommitmentService } from '../domain/commitment';
import { Commitment } from '../domain/commitment/types';

// Create a mock Express application specifically for integration testing
const app = express();
app.use(express.json());

// Injected test auth middleware that bypasses real Firebase Auth checks
app.use((req: any, res: any, next: NextFunction) => {
  req.user = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };
  next();
});

// Mount the Router
app.use('/api/commitments', commitmentRouter);

// Mock the CommitmentService static methods
vi.mock('../domain/commitment', async () => {
  const original = await vi.importActual<any>('../domain/commitment');
  return {
    ...original,
    CommitmentService: {
      getActive: vi.fn(),
      getAll: vi.fn(),
      create: vi.fn(),
      updateTaskStatus: vi.fn(),
    },
  };
});

// Mock the auth middleware so it injects the mock user automatically
vi.mock('../middleware/auth.middleware', () => {
  return {
    authenticate: (req: any, res: any, next: any) => {
      req.user = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };
      next();
    },
  };
});

describe('Commitment API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActiveCommitment: Commitment = {
    id: 'commitment-abc',
    userId: 'test-user-123',
    title: 'Deploy Production Core Services',
    description: 'Ensure complete service redundancy',
    dueDate: '2026-07-20',
    priority: 'high',
    status: 'active',
    createdAt: '2026-06-26T00:00:00Z',
    progressPercentage: 25,
    completedTasksCount: 1,
    totalTasksCount: 4,
    overallConfidence: 94,
    strategy: {
      title: 'Reliability Roadmap',
      description: 'Roadmap overview',
      milestones: [
        {
          id: 'milestone-1',
          title: 'Infrastructure Setup',
          description: 'Deploy raw nodes',
          targetDate: '2026-07-01',
          estimatedHours: 8,
          status: 'completed',
          createdAt: '2026-06-26T00:00:00Z',
          tasks: [
            {
              id: 'task-1-1',
              title: 'Provision baremetal',
              status: 'completed',
              estimatedHours: 4,
              isCriticalPath: true,
              date: '2026-06-27',
            },
          ],
        },
      ],
    },
  };

  it('GET /api/commitments/active - successfully retrieves active trajectory', async () => {
    vi.mocked(CommitmentService.getActive).mockResolvedValue(mockActiveCommitment);

    const response = await request(app)
      .get('/api/commitments/active')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockActiveCommitment);
    expect(CommitmentService.getActive).toHaveBeenCalledWith('test-user-123');
  });

  it('GET /api/commitments/active - handles empty/null active trajectory gracefully', async () => {
    vi.mocked(CommitmentService.getActive).mockResolvedValue(null);

    const response = await request(app)
      .get('/api/commitments/active')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();
  });

  it('GET /api/commitments - successfully lists all user commitments', async () => {
    vi.mocked(CommitmentService.getAll).mockResolvedValue([mockActiveCommitment]);

    const response = await request(app)
      .get('/api/commitments')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('commitment-abc');
  });

  it('POST /api/commitments - rejects empty or invalid schema inputs', async () => {
    const response = await request(app)
      .post('/api/commitments')
      .send({
        title: 'Hi', // too short
        dueDate: 'invalid-date',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('POST /api/commitments - successfully orchestrates plan creation', async () => {
    vi.mocked(CommitmentService.create).mockResolvedValue({
      ...mockActiveCommitment,
      title: 'Valid New Commitment',
    });

    const response = await request(app)
      .post('/api/commitments')
      .send({
        title: 'Valid New Commitment',
        description: 'New context details',
        dueDate: '2026-08-15',
        priority: 'medium',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Valid New Commitment');
    expect(CommitmentService.create).toHaveBeenCalled();
  });

  it('PATCH /api/commitments/:id/tasks/:taskId - updates status and outputs updated trajectory', async () => {
    const updatedCommitment = { ...mockActiveCommitment };
    updatedCommitment.strategy.milestones[0].tasks[0].status = 'completed';
    vi.mocked(CommitmentService.updateTaskStatus).mockResolvedValue(updatedCommitment);

    const response = await request(app)
      .patch('/api/commitments/commitment-abc/tasks/task-1-1')
      .send({ status: 'completed' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.strategy.milestones[0].tasks[0].status).toBe('completed');
  });

  it('PATCH /api/commitments/:id/tasks/:taskId - rejects invalid status types', async () => {
    const response = await request(app)
      .patch('/api/commitments/commitment-abc/tasks/task-1-1')
      .send({ status: 'invalid-status-value' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
  });
});
