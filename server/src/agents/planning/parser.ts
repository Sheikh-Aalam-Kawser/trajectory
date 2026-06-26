import { planningAgentOutputSchema } from './schema';
import { PlanningAgentOutput } from './types';
import { logger } from '../../logger';

export function parsePlanningResponse(rawResponse: string): PlanningAgentOutput {
  try {
    const json = JSON.parse(rawResponse);
    return planningAgentOutputSchema.parse(json);
  } catch (error) {
    logger.error('Failed to parse planning agent response:', error);
    throw new Error('Planning Agent Parser Failure: Invalid structure returned by AI');
  }
}
