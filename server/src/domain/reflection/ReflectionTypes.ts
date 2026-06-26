export interface ReflectionReport {
  id: string;
  commitmentId: string;
  userId: string;
  generatedAt: string;
  execution_summary: string;
  success_factors: string[];
  improvement_opportunities: string[];
  adaptation_effectiveness: string;
  execution_patterns: string[];
  recommendations: string[];
  overall_execution_score: number; // 0–100, deterministic
}
