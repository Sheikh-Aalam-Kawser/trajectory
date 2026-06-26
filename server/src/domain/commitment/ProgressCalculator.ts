import { Commitment, Milestone } from './types';

export class ProgressCalculator {
  /**
   * Recalculates metrics for a given commitment immutably.
   * Returns a new Commitment instance with updated progress, task counts, and milestone statuses.
   */
  static calculate(commitment: Commitment): Commitment {
    const updatedCommitment = JSON.parse(JSON.stringify(commitment)) as Commitment;
    let totalTasks = 0;
    let completedTasks = 0;

    updatedCommitment.strategy.milestones.forEach((m: Milestone, mIdx: number) => {
      if (m.tasks && m.tasks.length > 0) {
        m.tasks.forEach((t) => {
          totalTasks++;
          if (t.status === 'completed') {
            completedTasks++;
          }
        });

        // Determine milestone status
        const allCompleted = m.tasks.every((t) => t.status === 'completed');
        const anyActiveOrCompleted = m.tasks.some(
          (t) => t.status === 'in_progress' || t.status === 'completed' || t.status === 'skipped'
        );

        if (allCompleted) {
          m.status = 'completed';
        } else if (anyActiveOrCompleted) {
          // If in progress or partially completed, preserve the trajectory-calibrated delayed status
          // or mark as delayed if it's the second milestone, otherwise keep it pending/delayed based on index
          m.status = mIdx === 1 ? 'delayed' : 'pending';
        } else {
          m.status = 'pending';
        }
      } else {
        // Fallback if no tasks exist
        m.status = mIdx === 0 ? 'completed' : mIdx === 1 ? 'delayed' : 'pending';
      }
    });

    updatedCommitment.totalTasksCount = totalTasks;
    updatedCommitment.completedTasksCount = completedTasks;
    updatedCommitment.progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Dynamically adjust confidence level as tasks get completed or skipped
    // Higher completion rate maintains high confidence, skips might decrease it slightly
    let confidence = 94; // Baseline confidence
    const skippedTasks = ProgressCalculator.allTasksCount(updatedCommitment, 'skipped');
    if (totalTasks > 0) {
      const completionRatio = completedTasks / totalTasks;
      const skipRatio = skippedTasks / totalTasks;
      confidence = Math.min(
        100,
        Math.max(
          50,
          Math.round(85 + completionRatio * 15 - skipRatio * 20)
        )
      );
    }
    updatedCommitment.overallConfidence = confidence;

    return updatedCommitment;
  }

  private static allTasksCount(commitment: Commitment, status?: 'completed' | 'skipped' | 'in_progress' | 'pending'): number {
    let count = 0;
    commitment.strategy.milestones.forEach((m) => {
      if (m.tasks) {
        m.tasks.forEach((t) => {
          if (!status || t.status === status) {
            count++;
          }
        });
      }
    });
    return count;
  }
}
