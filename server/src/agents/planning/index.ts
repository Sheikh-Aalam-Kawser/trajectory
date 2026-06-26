import { GeminiService, Type, getActiveModel, STANDARD_GEMINI_VERSION } from '../../config/gemini';
import { parsePlanningResponse } from './parser';
import { PlanningAgentInput, PlanningAgentOutput } from './types';
import { AIAgentResponse } from '../../types';
import { logger } from '../../logger';
import { env } from '../../config/env';

export class PlanningAgent {
  public static readonly PROMPT_VERSION = 'planning/v1';

  static async run(input: PlanningAgentInput): Promise<AIAgentResponse<PlanningAgentOutput>> {
    const startTime = Date.now();
    logger.info(`Running PlanningAgent for commitment: "${input.commitment}"`);

    const hasApiKey = !!(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);

    try {
      if (!hasApiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const responseText = await GeminiService.generateStructuredText({
        promptVersion: PlanningAgent.PROMPT_VERSION,
        contents: `Commitment Title: "${input.commitment}"\nTarget Completion Date: "${input.dueDate}"\nAdditional Context/Notes: "${input.notes || 'None'}"`,
        systemInstruction: `You are the AI Planning Agent for Trajectory, an autonomous commitment execution system.
Your job is to analyze the user's high-stakes commitment and break it down into exactly 3 realistic, sequential, actionable milestones.
For each milestone, you must generate:
1. title: A concise, highly professional milestone name.
2. description: Details of what needs to be delivered and why.
3. targetDate: A realistic target completion date in YYYY-MM-DD format. The dates MUST be chronologically staggered, moving forward from today, with the final milestone's date aligning with the overall target date: ${input.dueDate}.
4. estimatedHours: Expected effort in hours.

Ensure the output is robust and perfectly tailored to the commitment context.`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'The overall title of the execution strategy.'
            },
            description: {
              type: Type.STRING,
              description: 'A comprehensive summary of the strategy.'
            },
            milestones: {
              type: Type.ARRAY,
              description: 'Exactly 3 sequential milestones.',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  targetDate: { type: Type.STRING },
                  estimatedHours: { type: Type.INTEGER }
                },
                required: ['title', 'description', 'targetDate', 'estimatedHours']
              }
            }
          },
          required: ['title', 'description', 'milestones']
        }
      });

      console.log('========== RAW MODEL OUTPUT START ==========');
      console.log(responseText);
      console.log('========== RAW MODEL OUTPUT END ==========');

      const parsedResult = parsePlanningResponse(responseText);

      return {
        success: true,
        data: parsedResult,
        metadata: {
          agent: 'planning',
          model: getActiveModel(),
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    } catch (error: any) {
      logger.warn(`PlanningAgent fell back to local calculations. Reason: ${error.message}`);

      // Dynamic calculation for fallbacks to make sure the app works without Gemini key or during downtime
      const now = new Date();
      const target = new Date(input.dueDate);
      const diffTime = Math.max(target.getTime() - now.getTime(), 0);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const stepDays = Math.max(Math.floor(diffDays / 3), 1);
      
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      const d1 = new Date(now.getTime() + stepDays * 24 * 60 * 60 * 1000);
      const d2 = new Date(now.getTime() + stepDays * 2 * 24 * 60 * 60 * 1000);
      const d3 = target;

      const fallbackResult: PlanningAgentOutput = {
        title: `Plan for: ${input.commitment}`,
        description: 'Structured execution roadmap created automatically by Trajectory.',
        milestones: [
          {
            title: 'Phase 1: Foundation & Requirements',
            description: `Establish core architecture, research guidelines, and initial specifications for: ${input.commitment}.`,
            targetDate: formatDate(d1 > target ? target : d1),
            estimatedHours: 8,
          },
          {
            title: 'Phase 2: Core Engineering & Assembly',
            description: `Implement primary system endpoints, front-to-back integration, and functional validation of: ${input.commitment}.`,
            targetDate: formatDate(d2 > target ? target : d2),
            estimatedHours: 16,
          },
          {
            title: 'Phase 3: Integration, Polish & Launch',
            description: `Conduct exhaustive usability checks, user interface polishing, and final sign-off of: ${input.commitment}.`,
            targetDate: formatDate(d3),
            estimatedHours: 12,
          }
        ]
      };

      return {
        success: true,
        data: fallbackResult,
        metadata: {
          agent: 'planning',
          model: 'local-fallback',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          latency: Date.now() - startTime,
        }
      };
    }
  }
}

