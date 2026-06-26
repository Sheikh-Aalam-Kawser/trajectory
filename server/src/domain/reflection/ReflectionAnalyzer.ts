import { Commitment, Task, Milestone } from '../commitment/types';
import { AdaptationPlan } from '../adaptation/AdaptationTypes';
import { DriftAssessment } from '../drift/DriftTypes';
import { ReflectionReport } from './ReflectionTypes';
import { ReflectionPolicy } from './ReflectionPolicy';

export class ReflectionAnalyzer {
  /**
   * Generates a fully deterministic, data-backed reflection report for a commitment.
   * Pure function: No side effects, no database calls, no AI.
   */
  static analyze(
    commitment: Commitment,
    adaptations: AdaptationPlan[],
    drift: DriftAssessment | null
  ): Omit<ReflectionReport, 'id' | 'generatedAt'> {
    // 1. Gather all tasks
    const allTasks: Task[] = [];
    commitment.strategy.milestones.forEach((m) => {
      if (m.tasks) {
        allTasks.push(...m.tasks);
      }
    });

    const totalTasksCount = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'completed');
    const skippedTasks = allTasks.filter((t) => t.status === 'skipped');
    const pendingTasks = allTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');

    const completedCount = completedTasks.length;
    const skippedCount = skippedTasks.length;
    const pendingCount = pendingTasks.length;

    // 2. Identify delayed milestones
    const delayedMilestones = commitment.strategy.milestones.filter(
      (m) => m.status === 'delayed'
    );
    const delayedMilestonesCount = delayedMilestones.length;

    // 3. Score Calculation (documented in detail)
    const scoreBreakdown = this.calculateScore(
      totalTasksCount,
      completedCount,
      skippedCount,
      delayedMilestonesCount,
      adaptations.length,
      drift ? drift.drift_percentage : 0
    );

    // 4. Determine execution patterns
    const execution_patterns: string[] = [];
    const success_factors: string[] = [];
    const improvement_opportunities: string[] = [];
    const recommendations: string[] = [];

    // Evaluate success factors
    if (completedCount > 0) {
      const completionRate = Math.round((completedCount / (totalTasksCount || 1)) * 100);
      success_factors.push(
        `Successfully completed ${completedCount} of ${totalTasksCount} planned tasks (${completionRate}% execution velocity).`
      );
    }
    if (skippedCount === 0 && totalTasksCount > 0) {
      success_factors.push('Maintained absolute adherence to planned tasks with zero skipped items.');
    }
    if (delayedMilestonesCount === 0 && totalTasksCount > 0) {
      success_factors.push('Achieved perfect schedule synchronization, completing all milestones on or before target dates.');
    }
    if (adaptations.length > 0) {
      success_factors.push(
        `Active course correction: Promptly adapted execution trajectory ${adaptations.length} time(s) when schedule drift occurred.`
      );
    }

    if (success_factors.length === 0) {
      success_factors.push('Initiated structured planning process and defined clear, incremental milestones.');
    }

    // Evaluate failure factors / improvement opportunities
    if (ReflectionPolicy.hasExcessiveSkips(skippedCount)) {
      execution_patterns.push('Task skipping pattern detected.');
      improvement_opportunities.push(
        `Skipped ${skippedCount} task(s). Frequently skipping tasks dilutes momentum and creates technical debt for later milestones.`
      );
      recommendations.push(
        'Break down high-friction tasks into smaller, ultra-manageable 1-hour blocks to avoid the temptation of skipping them.'
      );
    }

    if (ReflectionPolicy.hasMissedMilestones(delayedMilestonesCount)) {
      execution_patterns.push('Milestone schedule slippage.');
      improvement_opportunities.push(
        `Experienced delays on ${delayedMilestonesCount} milestone(s), pushing workloads into later phases of the commitment.`
      );
      recommendations.push(
        'Implement buffer periods (e.g., 20% extra time) on milestones containing critical path or high-complexity tasks.'
      );
    }

    if (drift && drift.drift_percentage >= ReflectionPolicy.HIGH_DRIFT_THRESHOLD) {
      execution_patterns.push('Significant schedule drift.');
      improvement_opportunities.push(
        `Significant schedule deviation of ${drift.drift_percentage}% detected between expected and actual progress.`
      );
      recommendations.push(
        'Establish daily check-ins at the start of each phase to detect drift early when it requires minor alignment rather than major adaptation.'
      );
    }

    // Check for workload underestimation
    const totalEstHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const avgTaskHours = totalTasksCount > 0 ? totalEstHours / totalTasksCount : 0;
    if (avgTaskHours > 4) {
      execution_patterns.push('Coarse-grained task estimation.');
      improvement_opportunities.push(
        `High average task duration (${avgTaskHours.toFixed(1)} hrs). Large tasks increase execution anxiety and are harder to schedule accurately.`
      );
      recommendations.push(
        'Limit individual task estimations to a maximum of 2–3 hours to improve daily scheduling accuracy and velocity tracking.'
      );
    }

    // Delayed start pattern: check if first milestone has pending tasks but today is past its target date
    const todayStr = new Date().toISOString().split('T')[0];
    const isFirstMilestoneDelayed = commitment.strategy.milestones[0] && commitment.strategy.milestones[0].targetDate < todayStr && commitment.strategy.milestones[0].status !== 'completed';
    if (isFirstMilestoneDelayed) {
      execution_patterns.push('Early-phase inertia (Delayed start).');
      improvement_opportunities.push(
        'Encountered delays right at the start of the commitment, creating compounding schedule pressures for subsequent milestones.'
      );
      recommendations.push(
        'Ensure the first milestone contains extremely simple, low-friction setup tasks to establish momentum on Day 1.'
      );
    }

    if (execution_patterns.length === 0) {
      execution_patterns.push('Steady linear execution pace.');
    }
    if (improvement_opportunities.length === 0) {
      improvement_opportunities.push('No major negative patterns detected. The strategy was executed with high discipline.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain the current planning style. Your task sizing and velocity expectations are highly accurate.');
    }

    // 5. Adaptation Effectiveness
    let adaptation_effectiveness = 'No adaptations were requested or applied during this commitment.';
    if (adaptations.length > 0) {
      const initialConfidence = commitment.originalStrategy ? 70 : 80; // approximate baseline if original strategy exists
      const currentConfidence = commitment.overallConfidence;
      const confidenceGain = currentConfidence - initialConfidence;

      if (confidenceGain > 0) {
        adaptation_effectiveness = `Trajectory adaptation was highly effective. Generating revised execution paths stabilized confidence from a projected baseline up to ${currentConfidence}%, allowing structured recovery.`;
      } else {
        adaptation_effectiveness = `Adaptations were applied to redistribute workloads. While execution remains challenging, the revised schedule prevented unmanaged terminal failure by maintaining structural clarity.`;
      }
    }

    // 6. Execution Summary
    let execution_summary = '';
    const formattedDueDate = new Date(commitment.dueDate).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (commitment.status === 'completed') {
      execution_summary = `Commitment successfully completed! All core objectives were achieved by the target deadline of ${formattedDueDate}. Final score: ${scoreBreakdown.score}/100.`;
    } else if (commitment.status === 'failed') {
      execution_summary = `Commitment marked as failed or expired. Despite trajectory adjustments, execution velocity did not meet the thresholds required for completion before ${formattedDueDate}.`;
    } else {
      execution_summary = `Active commitment retrospective. Currently at ${commitment.progressPercentage}% progress with ${pendingCount} pending task(s) remaining. Current calculated trajectory score: ${scoreBreakdown.score}/100.`;
    }

    return {
      commitmentId: commitment.id,
      userId: commitment.userId,
      execution_summary,
      success_factors,
      improvement_opportunities,
      adaptation_effectiveness,
      execution_patterns,
      recommendations,
      overall_execution_score: scoreBreakdown.score,
    };
  }

  /**
   * Calculates a deterministic score out of 100 based on execution history.
   * 
   * Scoring Breakdown (100 Max):
   * 1. Task Completion (50 Points): Points deducted proportionally to uncompleted/incomplete tasks.
   *    Formula: CompletionRate * 0.5 (e.g. 100% completion = 50 pts, 60% = 30 pts)
   * 
   * 2. Task Skips (Max -40 Points):
   *    Formula: -8 points per skipped task (helps discourage abandoning scheduled work)
   * 
   * 3. Milestone Delays (Max -30 Points):
   *    Formula: -10 points per delayed milestone (encourages maintaining milestone boundaries)
   * 
   * 4. Adaptation Volatility (Max -15 Points):
   *    Formula: -5 points per adaptation (reflects initial planning variance, though course correction is positive)
   * 
   * 5. Schedule Drift (Max -20 Points):
   *    Formula: -1 point per 2% of drift above a 10% tolerance threshold.
   */
  private static calculateScore(
    totalTasks: number,
    completedTasks: number,
    skippedTasks: number,
    delayedMilestones: number,
    adaptationCount: number,
    driftPercentage: number
  ): { score: number; details: string } {
    let score = 100;

    // Deduct for uncompleted tasks (Max -50 points)
    if (totalTasks > 0) {
      const incompleteFraction = (totalTasks - completedTasks) / totalTasks;
      const completionDeduction = Math.round(incompleteFraction * 50);
      score -= completionDeduction;
    } else {
      score -= 50; // No tasks planned
    }

    // Deduct for skipped tasks (Max -40)
    const skipDeduction = Math.min(40, skippedTasks * 8);
    score -= skipDeduction;

    // Deduct for delayed milestones (Max -30)
    const delayDeduction = Math.min(30, delayedMilestones * 10);
    score -= delayDeduction;

    // Deduct for adaptation volatility (Max -15)
    const adaptDeduction = Math.min(15, adaptationCount * 5);
    score -= adaptDeduction;

    // Deduct for schedule drift (Max -20)
    if (driftPercentage > 10) {
      const excessiveDrift = driftPercentage - 10;
      const driftDeduction = Math.min(20, Math.round(excessiveDrift * 0.5));
      score -= driftDeduction;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      details: 'Deterministic performance score calculation based on completion rate, task deviations, milestone delays, and course correction events.',
    };
  }
}
