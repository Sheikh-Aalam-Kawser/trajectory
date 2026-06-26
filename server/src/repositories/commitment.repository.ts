import { getDb } from '../config/firebase';
import { logger } from '../logger';
import { PlanningAgentOutput } from '../agents/planning/types';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  estimatedHours: number;
  status: 'pending' | 'completed' | 'delayed';
  createdAt: string;
}

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  strategy: {
    title: string;
    description: string;
    milestones: Milestone[];
  };
}

export class CommitmentRepository {
  private static collectionName = 'commitments';

  static async create(
    userId: string,
    title: string,
    description: string,
    dueDate: string,
    priority: 'high' | 'medium' | 'low',
    strategyOutput: PlanningAgentOutput
  ): Promise<Commitment> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    // Mark previous active commitments as completed/archived to support only one active commitment at a time
    try {
      const activeSnapshot = await db
        .collection(this.collectionName)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      if (!activeSnapshot.empty) {
        const batch = db.batch();
        activeSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { status: 'completed' });
        });
        await batch.commit();
        logger.info(`Archived ${activeSnapshot.size} previous active commitments for user ${userId}`);
      }
    } catch (err) {
      logger.error('Error archiving previous commitments:', err);
    }

    const commitmentId = db.collection(this.collectionName).doc().id;
    
    // Map milestones and inject IDs & initial status (completed/delayed/pending to mirror realistic trajectory flow)
    const milestones: Milestone[] = strategyOutput.milestones.map((m, index) => ({
      id: `milestone-${index + 1}-${Date.now()}`,
      title: m.title,
      description: m.description,
      targetDate: m.targetDate,
      estimatedHours: m.estimatedHours,
      status: index === 0 ? 'completed' : index === 1 ? 'delayed' : 'pending',
      createdAt: new Date().toISOString(),
    }));

    const commitment: Commitment = {
      id: commitmentId,
      userId,
      title,
      description,
      dueDate,
      priority,
      status: 'active',
      createdAt: new Date().toISOString(),
      strategy: {
        title: strategyOutput.title,
        description: strategyOutput.description,
        milestones,
      },
    };

    await db.collection(this.collectionName).doc(commitmentId).set(commitment);
    logger.info(`Successfully created commitment ${commitmentId} for user ${userId}`);
    return commitment;
  }

  static async getActive(userId: string): Promise<Commitment | null> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const snapshot = await db
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Commitment;
  }

  static async getAll(userId: string): Promise<Commitment[]> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const snapshot = await db
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as Commitment);
  }
}
