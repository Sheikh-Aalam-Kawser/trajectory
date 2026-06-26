import { DriftSeverity } from './DriftTypes';

export class DriftPolicy {
  // Threshold constants
  public static readonly ON_TRACK_MAX = 10;
  public static readonly MINOR_MAX = 25;
  public static readonly MODERATE_MAX = 40;

  /**
   * Determines the DriftSeverity based on the drift percentage.
   */
  static getSeverity(driftPercentage: number): DriftSeverity {
    if (driftPercentage <= this.ON_TRACK_MAX) {
      return 'on_track';
    }
    if (driftPercentage <= this.MINOR_MAX) {
      return 'minor';
    }
    if (driftPercentage <= this.MODERATE_MAX) {
      return 'moderate';
    }
    return 'critical';
  }

  /**
   * Encapsulates the recommendation policy.
   * Only 'moderate' and 'critical' severities recommend proactive adaptation.
   */
  static isAdaptationRecommended(severity: DriftSeverity): boolean {
    return severity === 'moderate' || severity === 'critical';
  }
}
