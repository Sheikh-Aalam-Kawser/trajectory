export interface AdaptationAgentInput {
  commitmentId: string;
  missedMilestones: string[];
  currentStatus: string;
  userReason?: string;
}

export interface AdaptationAgentOutput {
  replannedMilestones: Array<{
    title: string;
    description: string;
    targetDate: string;
    estimatedHours: number;
  }>;
  adaptationReason: string;
}
