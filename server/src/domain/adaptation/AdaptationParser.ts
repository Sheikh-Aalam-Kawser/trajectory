import { z } from 'zod';
import { AdaptationAgentOutput } from './AdaptationTypes';
import { logger } from '../../logger';

export const adaptationAgentOutputZodSchema = z.object({
  adaptation_summary: z.string(),
  risk_assessment: z.string(),
  recovery_strategy: z.string(),
  confidence_change: z.object({
    before: z.number(),
    after: z.number(),
    explanation: z.string(),
  }),
  revised_milestones: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      estimatedHours: z.number(),
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          date: z.string(),
          estimatedHours: z.number(),
          isCriticalPath: z.boolean(),
        })
      )
    })
  )
});

export function parseAdaptationResponse(rawResponse: string): AdaptationAgentOutput {
  try {
    // Strip markdown formatting if any
    let cleanedResponse = rawResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.substring(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.substring(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
    }
    cleanedResponse = cleanedResponse.trim();

    const json = JSON.parse(cleanedResponse);
    return adaptationAgentOutputZodSchema.parse(json);
  } catch (error) {
    logger.error('Failed to parse adaptation agent response:', error);
    throw new Error('Adaptation Agent Parser Failure: Invalid JSON structure or schema mismatch returned by AI');
  }
}
