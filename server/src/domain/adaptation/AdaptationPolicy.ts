import { Milestone, Task, Commitment } from '../commitment/types';

export class AdaptationPolicy {
  /**
   * Enforces that the user is indeed the owner of the commitment trajectory.
   */
  static isOwner(commitment: Commitment, userId: string): boolean {
    return commitment.userId === userId;
  }

  /**
   * Enforces the architectural constraint:
   * "Completed/skipped tasks are permanent and must never be altered, deleted, or rewrote."
   * Only future/pending tasks may change.
   */
  static validateAdaptation(
    originalMilestones: Milestone[],
    revisedMilestones: Milestone[],
    commitmentDueDate: string,
    todayStr: string
  ): { isValid: boolean; reason?: string } {
    // 1. Map original tasks by ID for quick lookup
    const originalTasksMap = new Map<string, { task: Task; milestoneId: string }>();
    for (const om of originalMilestones) {
      if (om.tasks) {
        for (const t of om.tasks) {
          originalTasksMap.set(t.id, { task: t, milestoneId: om.id });
        }
      }
    }

    // 2. Map revised tasks by ID
    const revisedTasksMap = new Map<string, Task>();
    for (const rm of revisedMilestones) {
      if (rm.tasks) {
        for (const t of rm.tasks) {
          revisedTasksMap.set(t.id, t);
        }
      }
    }

    // 3. Enforce immutability of historical items: completed & skipped tasks
    for (const [taskId, { task: originalTask }] of originalTasksMap.entries()) {
      const isHistorical = originalTask.status === 'completed' || originalTask.status === 'skipped';
      
      if (isHistorical) {
        const revisedTask = revisedTasksMap.get(taskId);
        
        // A historical task must not be deleted
        if (!revisedTask) {
          return {
            isValid: false,
            reason: `Historical task "${originalTask.title}" (ID: ${taskId}) was deleted. Historical tasks are permanent.`,
          };
        }

        // A historical task properties must not be altered
        if (
          revisedTask.title !== originalTask.title ||
          revisedTask.date !== originalTask.date ||
          revisedTask.estimatedHours !== originalTask.estimatedHours ||
          revisedTask.status !== originalTask.status
        ) {
          return {
            isValid: false,
            reason: `Historical task "${originalTask.title}" (ID: ${taskId}) was altered. Title, date, estimation, and status of historical tasks are immutable.`,
          };
        }
      }
    }

    // 4. Verify deadlines do not exceed commitment due date
    for (const rm of revisedMilestones) {
      if (rm.targetDate > commitmentDueDate) {
        return {
          isValid: false,
          reason: `Milestone "${rm.title}" has a target date (${rm.targetDate}) that exceeds the overall commitment due date (${commitmentDueDate}).`,
        };
      }
    }

    return { isValid: true };
  }
}
