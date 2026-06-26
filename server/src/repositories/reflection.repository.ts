import { getDb } from '../config/firebase';
import { logger } from '../logger';
import { ReflectionReport } from '../domain/reflection/ReflectionTypes';

export class ReflectionRepository {
  private static collectionName = 'reflections';

  /**
   * Generates a unique ID offline for a new reflection record.
   */
  static async generateId(): Promise<string> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }
    return db.collection(this.collectionName).doc().id;
  }

  /**
   * Saves a reflection record in the database.
   */
  static async save(reflection: ReflectionReport): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    await db.collection(this.collectionName).doc(reflection.id).set(reflection);
    logger.info(`Persisted reflection ${reflection.id} for commitment ${reflection.commitmentId}`);
  }

  /**
   * Retrieves reflections for a commitment.
   */
  static async getByCommitmentId(commitmentId: string): Promise<ReflectionReport[]> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const snapshot = await db
      .collection(this.collectionName)
      .where('commitmentId', '==', commitmentId)
      .orderBy('generatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as ReflectionReport);
  }
}
