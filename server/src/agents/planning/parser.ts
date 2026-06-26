import { planningAgentOutputSchema } from './schema';
import { PlanningAgentOutput } from './types';
import { logger } from '../../logger';

export function parsePlanningResponse(rawResponse: string): PlanningAgentOutput {
  // 1. Before JSON.parse logging
  logger.info('[PlanningParser Diagnostics] Before JSON.parse:');
  logger.info(`- typeof value: ${typeof rawResponse}`);
  logger.info(`- string length: ${rawResponse?.length ?? 0}`);
  logger.info(`- first 500 characters: ${rawResponse ? rawResponse.slice(0, 500) : ''}`);
  logger.info(`- last 500 characters: ${rawResponse ? rawResponse.slice(-500) : ''}`);

  let json: any;
  try {
    json = JSON.parse(rawResponse);
  } catch (error: any) {
    logger.error(`[PlanningParser Diagnostics] JSON.parse threw: ${error.message}`);
    if (error.stack) {
      logger.error(`[PlanningParser Diagnostics] Stack: ${error.stack}`);
    }
    const match = error.message.match(/position\s+(\d+)/i);
    if (match) {
      const pos = parseInt(match[1], 10);
      logger.info(`- character position: ${pos}`);
      if (rawResponse && pos >= 0 && pos < rawResponse.length) {
        logger.info(`- offending character: "${rawResponse[pos]}"`);
        const start = Math.max(0, pos - 20);
        const end = Math.min(rawResponse.length, pos + 20);
        logger.info(`- offending context: "...${rawResponse.slice(start, end)}..."`);
      }
    }
    throw new Error(`Planning Agent Parser Failure: Invalid JSON structure. Error: ${error.message}`);
  }

  try {
    return planningAgentOutputSchema.parse(json);
  } catch (zodError: any) {
    logger.error('[PlanningParser Diagnostics] Zod validation failed:');
    logger.error(`- parsed object: ${JSON.stringify(json, null, 2)}`);
    logger.error(`- formatted validation errors: ${JSON.stringify(zodError.errors || zodError.format?.() || zodError, null, 2)}`);
    throw zodError;
  }
}
