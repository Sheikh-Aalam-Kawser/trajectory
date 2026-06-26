import { getDb } from '../config/firebase';
import { logger } from '../logger';
import { AdaptationPlan } from '../domain/adaptation/AdaptationTypes';

export class AdaptationRepository {
  private static collectionName = 'adaptations';

  /**
   * Generates a unique ID offline for a new adaptation record.
   */
  static async generateId(): Promise<string> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }
    return db.collection(this.collectionName).doc().id;
  }

  /**
   * Saves an adaptation record in the database.
   */
  static async save(adaptation: AdaptationPlan): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    await db.collection(this.collectionName).doc(adaptation.id).set(adaptation);
    logger.info(`Persisted adaptation ${adaptation.id} for commitment ${adaptation.commitmentId}`);
  }

  /**
   * Retrieves all historical adaptations for a commitment.
   */
  static async getByCommitmentId(commitmentId: string): Promise<AdaptationPlan[]> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const snapshot = await db
      .collection(this.collectionName)
      .where('commitmentId', '==', commitmentId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as AdaptationPlan);
  }
}
