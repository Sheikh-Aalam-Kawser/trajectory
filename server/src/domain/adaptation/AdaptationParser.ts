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
  // 1. Before JSON.parse logging
  logger.info('[AdaptationParser Diagnostics] Before processing rawResponse:');
  logger.info(`- typeof value: ${typeof rawResponse}`);
  logger.info(`- string length: ${rawResponse?.length ?? 0}`);
  logger.info(`- first 500 characters: ${rawResponse ? rawResponse.slice(0, 500) : ''}`);
  logger.info(`- last 500 characters: ${rawResponse ? rawResponse.slice(-500) : ''}`);

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

    logger.info('[AdaptationParser Diagnostics] After stripping markdown:');
    logger.info(`- cleaned string length: ${cleanedResponse.length}`);
    logger.info(`- cleaned first 500 characters: ${cleanedResponse.slice(0, 500)}`);

    let json: any;
    try {
      json = JSON.parse(cleanedResponse);
    } catch (error: any) {
      logger.error(`[AdaptationParser Diagnostics] JSON.parse threw: ${error.message}`);
      if (error.stack) {
        logger.error(`[AdaptationParser Diagnostics] Stack: ${error.stack}`);
      }
      const match = error.message.match(/position\s+(\d+)/i);
      if (match) {
        const pos = parseInt(match[1], 10);
        logger.info(`- character position: ${pos}`);
        if (cleanedResponse && pos >= 0 && pos < cleanedResponse.length) {
          logger.info(`- offending character: "${cleanedResponse[pos]}"`);
          const start = Math.max(0, pos - 20);
          const end = Math.min(cleanedResponse.length, pos + 20);
          logger.info(`- offending context: "...${cleanedResponse.slice(start, end)}..."`);
        }
      }
      throw error;
    }

    try {
      return adaptationAgentOutputZodSchema.parse(json);
    } catch (zodError: any) {
      logger.error('[AdaptationParser Diagnostics] Zod validation failed:');
      logger.error(`- parsed object: ${JSON.stringify(json, null, 2)}`);
      logger.error(`- formatted validation errors: ${JSON.stringify(zodError.errors || zodError.format?.() || zodError, null, 2)}`);
      throw zodError;
    }
  } catch (error: any) {
    logger.error('Failed to parse adaptation agent response:', error);
    throw new Error(`Adaptation Agent Parser Failure: Invalid JSON structure or schema mismatch. Error: ${error.message}`);
  }
}
