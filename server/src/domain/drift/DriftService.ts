import { CommitmentRepository } from '../../repositories/commitment.repository';
import { DriftCalculator } from './DriftCalculator';
import { DriftAssessment } from './DriftTypes';
import { logger } from '../../logger';

export class DriftService {
  /**
   * Assesses execution drift for a given user and commitment.
   */
  static async assessDrift(userId: string, commitmentId: string): Promise<DriftAssessment> {
    logger.info(`Assessing drift for user: ${userId}, commitment: ${commitmentId}`);

    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== userId) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    // Determine today's date in local server/UTC format (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate drift assessment deterministically
    const assessment = DriftCalculator.calculate(commitment, todayStr);

    logger.info(`Drift assessment complete for ${commitmentId}: Drift is ${assessment.drift_percentage}% (${assessment.severity})`);
    return assessment;
  }
}
