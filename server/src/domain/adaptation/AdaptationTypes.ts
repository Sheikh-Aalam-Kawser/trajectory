import { Milestone, Task } from '../commitment/types';

export interface ConfidenceChange {
  before: number;
  after: number;
  explanation: string;
}

export interface AdaptationPlan {
  id: string;
  commitmentId: string;
  userId: string;
  strategyId: string;
  parentStrategyId: string;
  adaptation_summary: string;
  risk_assessment: string;
  recovery_strategy: string;
  confidence_change: ConfidenceChange;
  revised_milestones: Milestone[];
  createdAt: string;
}

export interface AdaptationAgentInput {
  commitmentId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  currentProgressPercentage: number;
  completedTasksCount: number;
  totalTasksCount: number;
  overallConfidence: number;
  
  // Current state of strategy
  strategyId: string;
  milestones: Milestone[];
  
  // Metadata for the prompt
  todayStr: string;
  remainingDays: number;
  remainingEstimatedHours: number;
  userReason?: string;
}

export interface AdaptationAgentOutput {
  adaptation_summary: string;
  risk_assessment: string;
  recovery_strategy: string;
  confidence_change: ConfidenceChange;
  // This contains only future milestones/tasks that were revised
  revised_milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetDate: string;
    estimatedHours: number;
    tasks: Array<{
      id: string;
      title: string;
      date: string;
      estimatedHours: number;
      isCriticalPath: boolean;
    }>;
  }>;
}
