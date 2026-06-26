import { getDb } from '../config/firebase';
import { logger } from '../logger';
import { Commitment } from '../domain/commitment/types';

export class CommitmentRepository {
  private static collectionName = 'commitments';

  /**
   * Generates a unique ID offline for a new commitment record.
   */
  static async generateId(): Promise<string> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }
    return db.collection(this.collectionName).doc().id;
  }

  /**
   * Retrieves a specific commitment by its unique ID.
   */
  static async getById(id: string): Promise<Commitment | null> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const docSnap = await db.collection(this.collectionName).doc(id).get();
    if (!docSnap.exists) {
      return null;
    }

    return docSnap.data() as Commitment;
  }

  /**
   * Saves or updates a commitment record in the database.
   */
  static async save(commitment: Commitment): Promise<void> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    await db.collection(this.collectionName).doc(commitment.id).set(commitment);
  }

  /**
   * Retrieves the current single active commitment for a user.
   */
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

  /**
   * Retrieves all commitments for a user, sorted by creation date.
   */
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

  /**
   * Archives previous active commitments for a user.
   * Returns the count of commitments updated.
   */
  static async archiveActiveCommitments(userId: string): Promise<number> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore DB not initialized');
    }

    const activeSnapshot = await db
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    if (activeSnapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    activeSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'completed' });
    });

    await batch.commit();
    return activeSnapshot.size;
  }
}
