import { adaptationAgentOutputSchema } from './schema';
import { AdaptationAgentOutput } from './types';
import { logger } from '../../logger';

export function parseAdaptationResponse(rawResponse: string): AdaptationAgentOutput {
  try {
    const json = JSON.parse(rawResponse);
    return adaptationAgentOutputSchema.parse(json);
  } catch (error) {
    logger.error('Failed to parse adaptation response:', error);
    throw new Error('Adaptation Agent Parser Failure: Invalid structure returned by AI');
  }
}
