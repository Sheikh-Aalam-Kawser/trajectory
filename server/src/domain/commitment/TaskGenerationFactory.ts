import { Task } from './types';

export class TaskGenerationFactory {
  /**
   * Generates standard tasks for a milestone.
   * This is designed to accept different generation strategies in the future (e.g., AI-driven),
   * satisfying downstream decoupling.
   */
  static generate(milestoneTitle: string, targetDateStr: string, index: number): Task[] {
    const nowStr = new Date().toISOString().split('T')[0];
    
    // Hand-crafted premium tasks matching the milestone sequence
    let taskTitles: string[] = [];
    if (index === 0) {
      taskTitles = [
        'Deconstruct UX constraints and establish user flow diagram',
        'Initialize workspace structure, baseline environment, and install dependencies',
        'Establish core database schema modeling and deploy initial index configurations',
        'Conduct structural validation and benchmark the core pipeline interfaces'
      ];
    } else if (index === 1) {
      taskTitles = [
        'Build end-to-end API integration layer with robust Zod validation schemas',
        'Implement central state synchronization for real-time progress calculations',
        'Construct primary high-fidelity dashboard views with polished typography',
        'Perform thorough functional edge-case validation and error boundary checks'
      ];
    } else {
      taskTitles = [
        'Conduct final system performance optimization and asset bundle analysis',
        'Execute Red Team security rules audit and data isolation checks',
        'Polish responsive viewport layouts and smooth transition animations',
        'Complete final end-to-end user verification and freeze active milestone paths'
      ];
    }

    return taskTitles.map((title, taskIdx) => {
      const targetDate = new Date(targetDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const daysBeforeTarget = (3 - taskIdx) * 2; // Spaced out: 6, 4, 2, 0 days before target
      const taskDate = new Date(targetDate.getTime() - daysBeforeTarget * 24 * 60 * 60 * 1000);
      const dateStr = taskDate < today ? nowStr : taskDate.toISOString().split('T')[0];

      return {
        id: `task-${index + 1}-${taskIdx + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        status: 'pending',
        estimatedHours: [2, 4, 3, 5][taskIdx] || 3,
        isCriticalPath: taskIdx === 0 || taskIdx === 2,
        date: dateStr,
      };
    });
  }
}
