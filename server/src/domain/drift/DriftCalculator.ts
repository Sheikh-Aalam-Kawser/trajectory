import { Commitment, Task } from '../commitment/types';
import { DriftAssessment, DriftSeverity } from './DriftTypes';
import { DriftPolicy } from './DriftPolicy';

export class DriftCalculator {
  /**
   * Performs deterministic assessment of a commitment's execution trajectory.
   * Expected progress is computed based on scheduled task dates up to today, with a linear-time fallback.
   */
  static calculate(commitment: Commitment, todayStr: string): DriftAssessment {
    // 1. Extract all tasks from milestones
    const allTasks: Task[] = [];
    commitment.strategy.milestones.forEach((m) => {
      if (m.tasks) {
        allTasks.push(...m.tasks);
      }
    });

    const totalTasksCount = allTasks.length;
    let actual_progress_percentage = 0;
    let expected_progress_percentage = 0;

    // 2. Calculate actual progress (completed workload or task counts)
    const totalEstimatedHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completedEstimatedHours = allTasks
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.estimatedHours, 0);

    if (totalEstimatedHours > 0) {
      actual_progress_percentage = Math.round((completedEstimatedHours / totalEstimatedHours) * 100);
    } else if (totalTasksCount > 0) {
      const completedTasksCount = allTasks.filter((t) => t.status === 'completed').length;
      actual_progress_percentage = Math.round((completedTasksCount / totalTasksCount) * 100);
    } else {
      actual_progress_percentage = commitment.progressPercentage;
    }

    // 3. Calculate expected progress based on the execution schedule (dates <= todayStr)
    // We also compute a time-based linear expected progress as a secondary reference
    let scheduleExpectedHours = 0;
    let scheduleExpectedCount = 0;

    allTasks.forEach((t) => {
      if (t.date <= todayStr) {
        scheduleExpectedHours += t.estimatedHours;
        scheduleExpectedCount++;
      }
    });

    let scheduleExpectedPercentage = 0;
    if (totalEstimatedHours > 0) {
      scheduleExpectedPercentage = Math.round((scheduleExpectedHours / totalEstimatedHours) * 100);
    } else if (totalTasksCount > 0) {
      scheduleExpectedPercentage = Math.round((scheduleExpectedCount / totalTasksCount) * 100);
    }

    // 4. Time-based linear expected progress
    const startDateStr = commitment.createdAt ? commitment.createdAt.split('T')[0] : todayStr;
    const dueDateStr = commitment.dueDate;

    const start = new Date(startDateStr);
    const due = new Date(dueDateStr);
    const today = new Date(todayStr);

    const totalTimelineMs = due.getTime() - start.getTime();
    const elapsedTimelineMs = today.getTime() - start.getTime();

    let timeExpectedPercentage = 0;
    if (totalTimelineMs > 0) {
      const elapsedRatio = Math.max(0, Math.min(1, elapsedTimelineMs / totalTimelineMs));
      timeExpectedPercentage = Math.round(elapsedRatio * 100);
    }

    // If there is an active task schedule with items already scheduled, we use that.
    // If no tasks are scheduled yet (or all are in the future but time has elapsed), 
    // we use a blended maximum or time-based fallback to detect early-phase inertia.
    if (totalTasksCount > 0) {
      // If time has progressed, but no tasks are scheduled yet or they are scheduled in the far future,
      // yet the user has done nothing, we check if the timeline itself has elapsed.
      // We will default to schedule-based, but if schedule-based expects 0% while timeline is 50% through,
      // we blend them or use the schedule-based since they planned it that way, but note it in explanation.
      expected_progress_percentage = scheduleExpectedPercentage;
    } else {
      expected_progress_percentage = timeExpectedPercentage;
    }

    // Ensure expected progress is at least what they have actually completed (since actual is already done!)
    expected_progress_percentage = Math.max(expected_progress_percentage, actual_progress_percentage);

    // 5. Calculate drift percentage (Expected - Actual)
    let drift_percentage = expected_progress_percentage - actual_progress_percentage;
    if (drift_percentage < 0) {
      drift_percentage = 0; // Ahead of schedule
    }

    // 6. Evaluate severity & recommendation using the policy
    const severity = DriftPolicy.getSeverity(drift_percentage);
    const adaptation_recommended = DriftPolicy.isAdaptationRecommended(severity);

    // 7. Generate a professional explanation
    const explanation = DriftCalculator.generateExplanation(
      severity,
      drift_percentage,
      actual_progress_percentage,
      expected_progress_percentage,
      timeExpectedPercentage,
      commitment.dueDate
    );

    return {
      expected_progress_percentage,
      actual_progress_percentage,
      drift_percentage,
      severity,
      adaptation_recommended,
      explanation,
    };
  }

  private static generateExplanation(
    severity: DriftSeverity,
    drift: number,
    actual: number,
    expected: number,
    timeExpected: number,
    dueDate: string
  ): string {
    const formattedDate = new Date(dueDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    switch (severity) {
      case 'on_track':
        if (actual >= expected && actual > 0) {
          return `Excellent! You are ahead of schedule. Actual progress is ${actual}% compared to an expected ${expected}%. You are fully on track to finish by ${formattedDate}.`;
        }
        return `You are fully on track. Your progress (${actual}%) is aligned with your planned schedule. Keep up the steady momentum.`;

      case 'minor':
        return `You are slightly behind your expected schedule by ${drift}%. Expected progress is ${expected}% but you have completed ${actual}%. Focus on upcoming tasks to prevent further schedule slippage.`;

      case 'moderate':
        return `You are approximately ${drift}% behind your expected execution pace (Expected: ${expected}%, Actual: ${actual}%). Trajectory recommends generating an adapted execution strategy to realign your target dates.`;

      case 'critical':
      default:
        return `Critical schedule deviation detected! You are ${drift}% behind your expected timeline. At the current execution rate, completing this commitment before the ${formattedDate} deadline is highly unlikely. Trajectory strongly recommends adapting your strategy immediately.`;
    }
  }
}
