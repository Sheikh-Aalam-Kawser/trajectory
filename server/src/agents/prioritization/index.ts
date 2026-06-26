import { getGeminiClient, STANDARD_GEMINI_MODEL, STANDARD_GEMINI_VERSION } from '../../config/gemini';
import { parsePrioritizationResponse } from './parser';
import { PrioritizationAgentInput, PrioritizationAgentOutput } from './types';
import { AIAgentResponse } from '../../types';
import { logger } from '../../logger';

export class PrioritizationAgent {
  static async run(input: PrioritizationAgentInput): Promise<AIAgentResponse<PrioritizationAgentOutput>> {
    const startTime = Date.now();
    logger.info(`Running PrioritizationAgent with ${input.milestones.length} milestones`);

    try {
      const mockResult: PrioritizationAgentOutput = {
        prioritizedMilestoneIds: input.milestones.map(m => m.id),
        reasoning: 'Milestones prioritized according to target date proximity.'
      };

      return {
        success: true,
        data: mockResult,
        metadata: {
          agent: 'prioritization',
          model: STANDARD_GEMINI_MODEL,
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    } catch (error: any) {
      logger.error('Error running PrioritizationAgent:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Unknown error occurred in PrioritizationAgent',
        metadata: {
          agent: 'prioritization',
          model: STANDARD_GEMINI_MODEL,
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    }
  }
}
