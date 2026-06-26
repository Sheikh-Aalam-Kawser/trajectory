import { CommitmentRepository } from '../../repositories/commitment.repository';
import { CommitmentPolicy } from './CommitmentPolicy';
import { ProgressCalculator } from './ProgressCalculator';
import { TaskGenerationFactory } from './TaskGenerationFactory';
import { Commitment, Milestone } from './types';
import { PlanningAgentOutput } from '../../agents/planning/types';
import { logger } from '../../logger';

export class CommitmentService {
  /**
   * Fetches the current active commitment trajectory for a user.
   */
  static async getActive(userId: string): Promise<Commitment | null> {
    return CommitmentRepository.getActive(userId);
  }

  /**
   * Retrieves all historical and in-flight trajectories for a user.
   */
  static async getAll(userId: string): Promise<Commitment[]> {
    return CommitmentRepository.getAll(userId);
  }

  /**
   * Orchestrates the creation of a new Commitment trajectory.
   * Archiving of prior paths, task generation, and metric calibration are performed here.
   */
  static async create(
    userId: string,
    title: string,
    description: string,
    dueDate: string,
    priority: 'high' | 'medium' | 'low',
    strategyOutput: PlanningAgentOutput
  ): Promise<Commitment> {
    // 1. Enforce CommitmentPolicy rule to archive active paths
    try {
      const count = await CommitmentRepository.archiveActiveCommitments(userId);
      if (count > 0) {
        logger.info(`Archived ${count} previous active commitments for user ${userId}`);
      }
    } catch (err) {
      logger.error('Error archiving previous commitments during trajectory creation:', err);
    }

    // 2. Generate milestones using downstream decoupled TaskGenerationFactory
    const milestones: Milestone[] = strategyOutput.milestones.map((m, index) => {
      const milestoneTasks = TaskGenerationFactory.generate(m.title, m.targetDate, index);
      
      // Seed initial momentum (First task completed, second task active)
      if (index === 0) {
        milestoneTasks[0].status = 'completed';
        milestoneTasks[1].status = 'in_progress';
      }

      return {
        id: `milestone-${index + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        estimatedHours: m.estimatedHours,
        status: index === 0 ? 'completed' : index === 1 ? 'delayed' : 'pending',
        createdAt: new Date().toISOString(),
        tasks: milestoneTasks,
      };
    });

    const commitmentId = await CommitmentRepository.generateId();

    let commitment: Commitment = {
      id: commitmentId,
      userId,
      title,
      description,
      dueDate,
      priority,
      status: 'active',
      createdAt: new Date().toISOString(),
      progressPercentage: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      overallConfidence: 94,
      strategy: {
        title: strategyOutput.title,
        description: strategyOutput.description,
        milestones,
      },
    };

    // 3. Calibrate metrics purely using the ProgressCalculator
    commitment = ProgressCalculator.calculate(commitment);

    // 4. Delegate to repository for pure persistence
    await CommitmentRepository.save(commitment);
    logger.info(`Successfully orchestrated and saved trajectory ${commitmentId} for user ${userId}`);
    return commitment;
  }

  /**
   * Orchestrates the patch/update process of a task status within an active trajectory.
   * Policies are verified, the aggregate is mutated, progress is recalculated, and persisted.
   */
  static async updateTaskStatus(
    userId: string,
    commitmentId: string,
    taskId: string,
    newStatus: 'pending' | 'completed' | 'skipped' | 'in_progress'
  ): Promise<Commitment> {
    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment trajectory not found');
    }

    // Enforce business security and ownership invariants via Policy
    if (!CommitmentPolicy.isOwner(commitment, userId)) {
      throw new Error('Unauthorized database write access');
    }

    // Mutation step of task status inside the aggregate
    let taskFound = false;
    commitment.strategy.milestones.forEach((m) => {
      if (m.tasks) {
        m.tasks.forEach((t) => {
          if (t.id === taskId) {
            t.status = newStatus;
            taskFound = true;
          }
        });
      }
    });

    if (!taskFound) {
      throw new Error(`Task with ID ${taskId} not found in commitment`);
    }

    // Pure recalculation of metrics
    const updatedCommitment = ProgressCalculator.calculate(commitment);

    // Persist changes
    await CommitmentRepository.save(updatedCommitment);
    logger.info(`Successfully updated and synchronized task ${taskId} to ${newStatus}`);
    return updatedCommitment;
  }
}
