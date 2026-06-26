export interface PrioritizationAgentInput {
  milestones: Array<{
    id: string;
    title: string;
    targetDate: string;
  }>;
}

export interface PrioritizationAgentOutput {
  prioritizedMilestoneIds: string[];
  reasoning: string;
}
