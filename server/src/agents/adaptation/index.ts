import { getGeminiClient, STANDARD_GEMINI_MODEL, STANDARD_GEMINI_VERSION } from '../../config/gemini';
import { parseAdaptationResponse } from './parser';
import { AdaptationAgentInput, AdaptationAgentOutput } from './types';
import { AIAgentResponse } from '../../types';
import { logger } from '../../logger';

export class AdaptationAgent {
  static async run(input: AdaptationAgentInput): Promise<AIAgentResponse<AdaptationAgentOutput>> {
    const startTime = Date.now();
    logger.info(`Running AdaptationAgent for commitment ID: ${input.commitmentId}`);

    try {
      const mockResult: AdaptationAgentOutput = {
        replannedMilestones: [
          {
            title: 'Shifted Milestone',
            description: 'Replanned due to previous delays.',
            targetDate: new Date().toISOString().split('T')[0],
            estimatedHours: 6,
          }
        ],
        adaptationReason: input.userReason || 'Automatic re-scheduling of delayed tasks to maintain deadline.'
      };

      return {
        success: true,
        data: mockResult,
        metadata: {
          agent: 'adaptation',
          model: STANDARD_GEMINI_MODEL,
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    } catch (error: any) {
      logger.error('Error running AdaptationAgent:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Unknown error occurred in AdaptationAgent',
        metadata: {
          agent: 'adaptation',
          model: STANDARD_GEMINI_MODEL,
          timestamp: new Date().toISOString(),
          version: STANDARD_GEMINI_VERSION,
          latency: Date.now() - startTime,
        }
      };
    }
  }
}
