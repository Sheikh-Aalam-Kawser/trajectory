import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommitmentRepository } from '../commitment.repository';
import { Commitment } from '../../domain/commitment/types';
import * as firebaseConfig from '../../config/firebase';

// Mock getDb from firebase config
vi.mock('../../config/firebase', async () => {
  const actual = await vi.importActual<any>('../../config/firebase');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('CommitmentRepository Tests', () => {
  let mockDb: any;
  let store: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = {};

    // Build a high-fidelity mock of the Firestore API
    mockDb = {
      collection: (colName: string) => {
        return {
          doc: (docId?: string) => {
            const actualId = docId || `mock-doc-id-${Math.random()}`;
            return {
              id: actualId,
              get: async () => ({
                exists: store[actualId] !== undefined,
                data: () => store[actualId],
              }),
              set: async (data: any) => {
                store[actualId] = data;
              },
              ref: { id: actualId },
            };
          },
          where: (field: string, op: string, val: any) => {
            // Return query mock
            return {
              where: (f2: string, op2: string, v2: any) => {
                return {
                  limit: (num: number) => {
                    return {
                      get: async () => {
                        const results = Object.values(store).filter(
                          (item) => item[field] === val && item[f2] === v2
                        );
                        return {
                          empty: results.length === 0,
                          docs: results.slice(0, num).map((res) => ({
                            data: () => res,
                            ref: { id: res.id },
                          })),
                        };
                      },
                    };
                  },
                  get: async () => {
                    const results = Object.values(store).filter(
                      (item) => item[field] === val && item[f2] === v2
                    );
                    return {
                      empty: results.length === 0,
                      size: results.length,
                      docs: results.map((res) => ({
                        data: () => res,
                        ref: { id: res.id },
                      })),
                    };
                  },
                };
              },
              orderBy: (sortField: string, order: string) => {
                return {
                  get: async () => {
                    const results = Object.values(store)
                      .filter((item) => item[field] === val)
                      .sort((a, b) => {
                        if (order === 'desc') {
                          return b[sortField] > a[sortField] ? 1 : -1;
                        }
                        return a[sortField] > b[sortField] ? 1 : -1;
                      });
                    return {
                      empty: results.length === 0,
                      docs: results.map((res) => ({
                        data: () => res,
                        ref: { id: res.id },
                      })),
                    };
                  },
                };
              },
            };
          },
        };
      },
      batch: () => {
        const batchOps: Array<() => void> = [];
        return {
          update: (ref: any, data: any) => {
            batchOps.push(() => {
              if (store[ref.id]) {
                store[ref.id] = { ...store[ref.id], ...data };
              }
            });
          },
          commit: async () => {
            batchOps.forEach((op) => op());
          },
        };
      },
    };

    vi.mocked(firebaseConfig.getDb).mockReturnValue(mockDb);
  });

  const mockCommitment: Commitment = {
    id: 'commitment-repo-1',
    userId: 'user-xyz',
    title: 'Test Repository Trajectory',
    description: 'Ensure backend queries work correctly',
    dueDate: '2026-07-31',
    priority: 'low',
    status: 'active',
    createdAt: '2026-06-26T00:00:00Z',
    progressPercentage: 10,
    completedTasksCount: 1,
    totalTasksCount: 10,
    overallConfidence: 85,
    strategy: { title: '', description: '', milestones: [] },
  };

  it('generates offline IDs successfully', async () => {
    const id = await CommitmentRepository.generateId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('saves and retrieves commitments accurately', async () => {
    await CommitmentRepository.save(mockCommitment);
    
    const retrieved = await CommitmentRepository.getById(mockCommitment.id);
    expect(retrieved).toEqual(mockCommitment);
  });

  it('retrieves the active commitment for a user', async () => {
    await CommitmentRepository.save(mockCommitment);
    
    // Also save a completed one
    const completedCommitment = {
      ...mockCommitment,
      id: 'commitment-repo-2',
      status: 'completed' as const,
    };
    await CommitmentRepository.save(completedCommitment);

    const active = await CommitmentRepository.getActive('user-xyz');
    expect(active).not.toBeNull();
    expect(active?.id).toBe(mockCommitment.id);
    expect(active?.status).toBe('active');
  });

  it('retrieves all commitments for a user sorted by creation date', async () => {
    const older = {
      ...mockCommitment,
      id: 'c-older',
      createdAt: '2026-06-20T00:00:00Z',
    };
    const newer = {
      ...mockCommitment,
      id: 'c-newer',
      createdAt: '2026-06-25T00:00:00Z',
    };

    await CommitmentRepository.save(older);
    await CommitmentRepository.save(newer);

    const all = await CommitmentRepository.getAll('user-xyz');
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('c-newer'); // Sorted descending
    expect(all[1].id).toBe('c-older');
  });

  it('archives all active commitments for a user correctly', async () => {
    const c1 = { ...mockCommitment, id: 'c1', status: 'active' as const };
    const c2 = { ...mockCommitment, id: 'c2', status: 'active' as const };
    const cOther = { ...mockCommitment, id: 'c3', userId: 'user-other', status: 'active' as const };

    await CommitmentRepository.save(c1);
    await CommitmentRepository.save(c2);
    await CommitmentRepository.save(cOther);

    const count = await CommitmentRepository.archiveActiveCommitments('user-xyz');
    expect(count).toBe(2);

    const retrievedC1 = await CommitmentRepository.getById('c1');
    const retrievedC2 = await CommitmentRepository.getById('c2');
    const retrievedCOther = await CommitmentRepository.getById('c3');

    expect(retrievedC1?.status).toBe('completed');
    expect(retrievedC2?.status).toBe('completed');
    expect(retrievedCOther?.status).toBe('active'); // remains untouched
  });
});
