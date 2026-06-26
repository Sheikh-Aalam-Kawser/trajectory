export class ReflectionPolicy {
  public static readonly EXCESSIVE_SKIPS_THRESHOLD = 2;
  public static readonly EXCESSIVE_ADAPTATIONS_THRESHOLD = 2;
  public static readonly HIGH_DRIFT_THRESHOLD = 25; // 25% drift is considered high
  public static readonly MISSED_MILESTONES_THRESHOLD = 1;

  /**
   * Determine if the user has excessive skipped tasks.
   */
  static hasExcessiveSkips(skippedCount: number): boolean {
    return skippedCount >= this.EXCESSIVE_SKIPS_THRESHOLD;
  }

  /**
   * Determine if the user has excessive adaptations.
   */
  static hasExcessiveAdaptations(adaptationCount: number): boolean {
    return adaptationCount >= this.EXCESSIVE_ADAPTATIONS_THRESHOLD;
  }

  /**
   * Determine if a commitment had missed milestones.
   */
  static hasMissedMilestones(missedCount: number): boolean {
    return missedCount >= this.MISSED_MILESTONES_THRESHOLD;
  }
}
