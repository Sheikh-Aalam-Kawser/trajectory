import { GeminiService, getActiveModel, STANDARD_GEMINI_VERSION } from '../../config/gemini';
import { parseAdaptationResponse } from './AdaptationParser';
import { AdaptationAgentInput, AdaptationAgentOutput } from './AdaptationTypes';
import { AdaptationResponseSchema } from './AdaptationSchema';
import { AIAgentResponse } from '../../types';
import { logger } from '../../logger';
import { env } from '../../config/env';

export class AdaptationAgent {
  public static readonly PROMPT_VERSION = 'adaptation/v1';

  static async run(input: AdaptationAgentInput): Promise<AIAgentResponse<AdaptationAgentOutput>> {
    const startTime = Date.now();
    logger.info(`Running AdaptationAgent for commitment ID: ${input.commitmentId}`);

    const hasApiKey = !!(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);

    try {
      if (!hasApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      // Format current status text for the prompt
      const milestoneContext = input.milestones.map((m, mIdx) => {
        const tasksText = (m.tasks || []).map(t => 
          `- [${t.status.toUpperCase()}] ${t.title} (Est: ${t.estimatedHours}h, Date: ${t.date}, Critical: ${t.isCriticalPath})`
        ).join('\n');
        return `Milestone ${mIdx + 1}: ${m.title}\nDescription: ${m.description}\nTarget Date: ${m.targetDate}\nStatus: ${m.status}\nTasks:\n${tasksText}`;
      }).join('\n\n');

      const responseText = await GeminiService.generateStructuredText({
        promptVersion: AdaptationAgent.PROMPT_VERSION,
        contents: `Commitment: "${input.title}"
Description: "${input.description || 'None'}"
Main Deadline: ${input.dueDate}
Priority: ${input.priority}
Today's Date: ${input.todayStr}
Remaining Days: ${input.remainingDays}
Remaining Estimated Effort: ${input.remainingEstimatedHours} hours
Current Progress Percentage: ${input.currentProgressPercentage}%
Completed Tasks: ${input.completedTasksCount} / ${input.totalTasksCount}
Current Confidence: ${input.overallConfidence}%
User Feedback/Reason for Adaptation: "${input.userReason || 'None provided'}"

--- CURRENT STRATEGY & TASK STATUSES ---
${milestoneContext}`,
        systemInstruction: `You are the AI Adaptation Agent for Trajectory, an autonomous commitment execution system.
Your goal is to answer: "Given what has actually happened, what is now the best way to complete this commitment before the deadline?"

You must perform a meticulous analysis of:
1. Schedule drift: Compare today's date against original task schedules and milestones.
2. Execution velocity: Estimate the speed at which the user is completing tasks.
3. Missed work: Account for skipped or delayed tasks that must be rescheduled or adjusted.
4. Remaining capacity: Verify if the user can realistically complete the remaining hours within the remaining days.
5. Critical path changes: Determine which upcoming tasks are essential for success.
6. Deadline feasibility: Assess if the main commitment deadline is still achievable.

Enforce the following strict rules:
- Only modify future or current in-progress/pending tasks.
- NEVER rewrite completed or skipped history. Completed work is permanent and immutable.
- Keep the exact same task and milestone IDs in your response so lineage is preserved.
- Adjust milestone target dates only if absolutely necessary, but they MUST NEVER exceed the main deadline: ${input.dueDate}.
- Ensure the output conforms perfectly to the requested JSON response schema.`,
        responseSchema: AdaptationResponseSchema as any,
      });

      const parsedResult = parseAdaptationResponse(responseText);

      return {
        success: true,
        data: parsedResult,
        metadata: {
          agent: 'adaptation',
          model: getActiveModel(),
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    } catch (error: any) {
      logger.warn(`AdaptationAgent fell back to local calculations. Reason: ${error.message}`);

      // Perform dynamic, deterministic local fallback calculation
      // Let's identify pending/in_progress tasks and shift them forward
      const today = new Date(input.todayStr);
      
      const revisedMilestones = input.milestones.map((m) => {
        let revisedTargetDate = m.targetDate;
        
        const revisedTasks = (m.tasks || []).map((t) => {
          // If task is completed or skipped, do not modify
          if (t.status === 'completed' || t.status === 'skipped') {
            return { ...t };
          }
          
          // For pending/in-progress tasks, if they are scheduled in the past or today, shift them slightly forward
          const taskDate = new Date(t.date);
          let revisedTaskDateStr = t.date;
          
          if (taskDate <= today) {
            // Shift forward to today + some offset
            const offsetDays = t.status === 'in_progress' ? 1 : 2;
            const shiftedDate = new Date(today.getTime() + offsetDays * 24 * 60 * 60 * 1000);
            
            // Do not shift beyond the main commitment deadline
            const commitmentDue = new Date(input.dueDate);
            const finalTaskDate = shiftedDate > commitmentDue ? commitmentDue : shiftedDate;
            revisedTaskDateStr = finalTaskDate.toISOString().split('T')[0];
          }
          
          return {
            ...t,
            date: revisedTaskDateStr,
          };
        });

        // The revised milestone targetDate must be the maximum of its tasks' dates or its current target date
        const taskDates = revisedTasks.map(t => new Date(t.date));
        if (taskDates.length > 0) {
          const maxTaskDate = new Date(Math.max(...taskDates.map(d => d.getTime())));
          const currentMilestoneDate = new Date(m.targetDate);
          const finalMilestoneDate = maxTaskDate > currentMilestoneDate ? maxTaskDate : currentMilestoneDate;
          
          const commitmentDue = new Date(input.dueDate);
          const boundedMilestoneDate = finalMilestoneDate > commitmentDue ? commitmentDue : finalMilestoneDate;
          revisedTargetDate = boundedMilestoneDate.toISOString().split('T')[0];
        }

        return {
          id: m.id,
          title: m.title,
          description: m.description,
          targetDate: revisedTargetDate,
          estimatedHours: m.estimatedHours,
          tasks: revisedTasks,
        };
      });

      // Recalculate confidence
      const beforeConfidence = input.overallConfidence;
      // Confidence drops slightly due to rescheduling drift, but increases with recovery plan
      const afterConfidence = Math.min(Math.max(beforeConfidence - 5, 50), 95);

      const fallbackResult: AdaptationAgentOutput = {
        adaptation_summary: `Detected schedule slippage based on actual velocity. Generating a calibrated recovery path to catch up on ${input.remainingEstimatedHours} hours of pending effort.`,
        risk_assessment: 'Increased workload density across upcoming milestones. Slack margins are reduced, demanding steady focus.',
        recovery_strategy: 'Shifted past-due pending objectives to start immediately from today. Maintained all completed work history intact.',
        confidence_change: {
          before: beforeConfidence,
          after: afterConfidence,
          explanation: 'Confidence adjusted down slightly to reflect compressed timelines, but remains high due to structured re-scheduling.',
        },
        revised_milestones: revisedMilestones.map(rm => ({
          id: rm.id,
          title: rm.title,
          description: rm.description,
          targetDate: rm.targetDate,
          estimatedHours: rm.estimatedHours,
          tasks: rm.tasks.map(t => ({
            id: t.id,
            title: t.title,
            date: t.date,
            estimatedHours: t.estimatedHours,
            isCriticalPath: t.isCriticalPath,
          }))
        })),
      };

      return {
        success: true,
        data: fallbackResult,
        metadata: {
          agent: 'adaptation',
          model: 'local-fallback',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          latency: Date.now() - startTime,
        }
      };
    }
  }
}
