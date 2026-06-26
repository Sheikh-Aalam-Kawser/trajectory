import { CommitmentRepository } from '../../repositories/commitment.repository';
import { AdaptationRepository } from '../../repositories/adaptation.repository';
import { ReflectionRepository } from '../../repositories/reflection.repository';
import { DriftCalculator } from '../drift/DriftCalculator';
import { ReflectionAnalyzer } from './ReflectionAnalyzer';
import { ReflectionReport } from './ReflectionTypes';
import { logger } from '../../logger';

export class ReflectionService {
  /**
   * Retrieves the most recent reflection report for a commitment. 
   * If none exists, generates and persists a new one.
   */
  static async getOrCreateReflection(userId: string, commitmentId: string): Promise<ReflectionReport> {
    logger.info(`getOrCreateReflection: userId=${userId}, commitmentId=${commitmentId}`);

    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== userId) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    // Check if reflection already exists
    const existingReflections = await ReflectionRepository.getByCommitmentId(commitmentId);
    if (existingReflections.length > 0) {
      logger.info(`Found existing reflection report for commitment ${commitmentId}`);
      return existingReflections[0]; // Return the latest one
    }

    // Generate and save a new one
    return this.generateAndSaveReflection(userId, commitmentId);
  }

  /**
   * Explicitly generates and persists a new immutable reflection report for the commitment.
   */
  static async generateAndSaveReflection(userId: string, commitmentId: string): Promise<ReflectionReport> {
    logger.info(`Generating a new immutable reflection for commitment: ${commitmentId}`);

    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== userId) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    // 1. Fetch adaptation history
    const adaptations = await AdaptationRepository.getByCommitmentId(commitmentId);

    // 2. Fetch drift assessment
    const todayStr = new Date().toISOString().split('T')[0];
    const drift = DriftCalculator.calculate(commitment, todayStr);

    // 3. Analyze commitment execution data
    const reportData = ReflectionAnalyzer.analyze(commitment, adaptations, drift);

    // 4. Generate unique ID and timestamp
    const reflectionId = await ReflectionRepository.generateId();
    const reflectionReport: ReflectionReport = {
      id: reflectionId,
      generatedAt: new Date().toISOString(),
      ...reportData,
    };

    // 5. Persist to Firestore reflections collection
    await ReflectionRepository.save(reflectionReport);

    return reflectionReport;
  }

  /**
   * Gets the full historical reflection reports for a commitment.
   */
  static async getReflectionHistory(userId: string, commitmentId: string): Promise<ReflectionReport[]> {
    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (commitment.userId !== userId) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    return ReflectionRepository.getByCommitmentId(commitmentId);
  }
}
