export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'skipped' | 'in_progress';
  estimatedHours: number;
  isCriticalPath: boolean;
  date: string; // YYYY-MM-DD
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  estimatedHours: number;
  status: 'pending' | 'completed' | 'delayed';
  createdAt: string;
  tasks: Task[];
}

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  progressPercentage: number;
  completedTasksCount: number;
  totalTasksCount: number;
  overallConfidence: number;
  strategy: {
    title: string;
    description: string;
    milestones: Milestone[];
  };
}
