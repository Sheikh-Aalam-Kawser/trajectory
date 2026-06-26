import { Commitment } from './types';

export class CommitmentPolicy {
  /**
   * Validates if a transition from current status to next status is permitted.
   */
  static isTransitionAllowed(currentStatus: Commitment['status'], nextStatus: Commitment['status']): boolean {
    if (currentStatus === nextStatus) return true;

    // Terminal states cannot be transition targets, nor can you transition from them
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      return false;
    }

    // Active status can only move to completed or failed
    if (currentStatus === 'active') {
      return nextStatus === 'completed' || nextStatus === 'failed';
    }

    return false;
  }

  /**
   * Business rule: When establishing a new trajectory path, previous active paths must be marked as completed.
   */
  static getArchivedStatus(): Commitment['status'] {
    return 'completed';
  }

  /**
   * Core security invariant checking that the target commitment is owned by the request user context.
   */
  static isOwner(commitment: Commitment, userId: string): boolean {
    return commitment.userId === userId;
  }
}
