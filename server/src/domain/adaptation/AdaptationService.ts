import { CommitmentRepository } from '../../repositories/commitment.repository';
import { AdaptationRepository } from '../../repositories/adaptation.repository';
import { AdaptationPolicy } from './AdaptationPolicy';
import { AdaptationAgent } from './AdaptationAgent';
import { ProgressCalculator } from '../commitment/ProgressCalculator';
import { AdaptationAgentOutput, AdaptationPlan } from './AdaptationTypes';
import { Commitment } from '../commitment/types';
import { logger } from '../../logger';

export class AdaptationService {
  /**
   * Generates an adaptation plan proposal using the AdaptationAgent.
   */
  static async generatePlanProposal(
    userId: string,
    commitmentId: string,
    userReason?: string
  ): Promise<AdaptationAgentOutput> {
    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (!AdaptationPolicy.isOwner(commitment, userId)) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    // Calculate metadata for prompt execution
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const target = new Date(commitment.dueDate);
    const diffTime = Math.max(target.getTime() - today.getTime(), 0);
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let remainingEstimatedHours = 0;
    commitment.strategy.milestones.forEach((m) => {
      if (m.tasks) {
        m.tasks.forEach((t) => {
          if (t.status === 'pending' || t.status === 'in_progress') {
            remainingEstimatedHours += t.estimatedHours;
          }
        });
      }
    });

    const activeStrategy = commitment.strategy as any;
    const strategyId = activeStrategy.id || `strategy-init-${commitment.id}`;

    const agentInput = {
      commitmentId: commitment.id,
      title: commitment.title,
      description: commitment.description,
      dueDate: commitment.dueDate,
      priority: commitment.priority,
      currentProgressPercentage: commitment.progressPercentage,
      completedTasksCount: commitment.completedTasksCount,
      totalTasksCount: commitment.totalTasksCount,
      overallConfidence: commitment.overallConfidence,
      strategyId,
      milestones: commitment.strategy.milestones,
      todayStr,
      remainingDays,
      remainingEstimatedHours,
      userReason,
    };

    const agentResult = await AdaptationAgent.run(agentInput);

    if (!agentResult.success || !agentResult.data) {
      throw new Error(agentResult.error || 'AI Adaptation Engine failed to generate proposal');
    }

    return agentResult.data;
  }

  /**
   * Applies the proposed adaptation plan, verifying policies, preserving lineage, and updating the commitment.
   */
  static async applyAdaptationPlan(
    userId: string,
    commitmentId: string,
    proposal: AdaptationAgentOutput
  ): Promise<Commitment> {
    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (!AdaptationPolicy.isOwner(commitment, userId)) {
      throw new Error('Unauthorized access: You do not own this commitment');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build the fully resolved proposed milestones
    // Gemini only outputs the revised future milestones and their tasks.
    // We must merge these revised future milestones with our completed/skipped past milestones.
    const originalMilestones = commitment.strategy.milestones;
    const revisedMilestonesMap = new Map(proposal.revised_milestones.map(m => [m.id, m]));

    const mergedMilestones = originalMilestones.map((origM) => {
      const revisedM = revisedMilestonesMap.get(origM.id);
      if (!revisedM) {
        // If Gemini did not suggest changes to this milestone, keep it as is
        return { ...origM };
      }

      // Merge tasks
      const originalTasks = origM.tasks || [];
      const revisedTasksMap = new Map(revisedM.tasks.map(t => [t.id, t]));

      const mergedTasks = originalTasks.map((origT) => {
        const revT = revisedTasksMap.get(origT.id);
        if (!revT) {
          return { ...origT };
        }

        // Keep historical status intact (immutable history check)
        const status = (origT.status === 'completed' || origT.status === 'skipped') 
          ? origT.status 
          : origT.status; // Preserve original status for all

        return {
          ...origT,
          title: revT.title,
          date: revT.date,
          estimatedHours: revT.estimatedHours,
          isCriticalPath: revT.isCriticalPath,
          status,
        };
      });

      return {
        ...origM,
        title: revisedM.title,
        description: revisedM.description,
        targetDate: revisedM.targetDate,
        estimatedHours: revisedM.estimatedHours,
        tasks: mergedTasks,
      };
    });

    // Run domain policy checks
    const policyResult = AdaptationPolicy.validateAdaptation(
      originalMilestones,
      mergedMilestones,
      commitment.dueDate,
      todayStr
    );

    if (!policyResult.isValid) {
      throw new Error(policyResult.reason || 'Adaptation plan violated domain constraints');
    }

    // Save original strategy on first adaptation to ensure it is never lost
    const activeStrategy = commitment.strategy as any;
    const parentStrategyId = activeStrategy.id || `strategy-init-${commitment.id}`;

    if (!commitment.originalStrategy) {
      commitment.originalStrategy = {
        id: parentStrategyId,
        title: commitment.strategy.title,
        description: commitment.strategy.description,
        milestones: JSON.parse(JSON.stringify(commitment.strategy.milestones)),
      };
    }

    // Generate new strategy ID
    const newStrategyId = `strategy-adapt-${Date.now()}`;
    const adaptationId = await AdaptationRepository.generateId();

    // Create and save adaptation plan document to adaptations collection (preserves lineage)
    const adaptationRecord: AdaptationPlan = {
      id: adaptationId,
      commitmentId: commitment.id,
      userId,
      strategyId: newStrategyId,
      parentStrategyId,
      adaptation_summary: proposal.adaptation_summary,
      risk_assessment: proposal.risk_assessment,
      recovery_strategy: proposal.recovery_strategy,
      confidence_change: proposal.confidence_change,
      revised_milestones: mergedMilestones,
      createdAt: new Date().toISOString(),
    };

    await AdaptationRepository.save(adaptationRecord);

    // Update commitment state
    commitment.strategy = {
      id: newStrategyId,
      title: commitment.strategy.title,
      description: commitment.strategy.description,
      milestones: mergedMilestones,
    } as any;

    commitment.overallConfidence = proposal.confidence_change.after;

    // Recalculate metrics (percentage, counts)
    const calibratedCommitment = ProgressCalculator.calculate(commitment);

    // Save back to Firestore commitments collection
    await CommitmentRepository.save(calibratedCommitment);

    logger.info(`Successfully applied adaptation plan ${adaptationId} for commitment ${commitmentId}`);
    return calibratedCommitment;
  }

  /**
   * Retrieves all historical adaptations for a commitment.
   */
  static async getAdaptationsForCommitment(
    userId: string,
    commitmentId: string
  ): Promise<AdaptationPlan[]> {
    const commitment = await CommitmentRepository.getById(commitmentId);
    if (!commitment) {
      throw new Error('Commitment not found');
    }

    if (!AdaptationPolicy.isOwner(commitment, userId)) {
      throw new Error('Unauthorized access');
    }

    return AdaptationRepository.getByCommitmentId(commitmentId);
  }
}
