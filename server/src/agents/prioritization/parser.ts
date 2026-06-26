import { prioritizationAgentOutputSchema } from './schema';
import { PrioritizationAgentOutput } from './types';
import { logger } from '../../logger';

export function parsePrioritizationResponse(rawResponse: string): PrioritizationAgentOutput {
  try {
    const json = JSON.parse(rawResponse);
    return prioritizationAgentOutputSchema.parse(json);
  } catch (error) {
    logger.error('Failed to parse prioritization response:', error);
    throw new Error('Prioritization Agent Parser Failure: Invalid structure returned by AI');
  }
}
