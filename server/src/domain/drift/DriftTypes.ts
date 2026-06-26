export type DriftSeverity = 'on_track' | 'minor' | 'moderate' | 'critical';

export interface DriftAssessment {
  expected_progress_percentage: number;
  actual_progress_percentage: number;
  drift_percentage: number;
  severity: DriftSeverity;
  adaptation_recommended: boolean;
  explanation: string;
}
