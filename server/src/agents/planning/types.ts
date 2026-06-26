export interface PlanningAgentInput {
  commitment: string;
  dueDate: string;
  notes?: string;
}

export interface PlanningAgentOutput {
  title: string;
  description: string;
  milestones: Array<{
    title: string;
    description: string;
    targetDate: string;
    estimatedHours: number;
  }>;
}
