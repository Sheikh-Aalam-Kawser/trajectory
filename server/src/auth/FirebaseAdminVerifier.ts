import { getAuth } from '../config/firebase';
import { logger } from '../logger';
import { TrajectoryUser } from '../../../shared/types/auth';

export class FirebaseAdminVerifier {
  static async verify(token: string): Promise<TrajectoryUser> {
    const authAdmin = getAuth();
    if (!authAdmin) {
      throw new Error('FirebaseAdminVerifier: Firebase Admin Auth is not configured or available');
    }

    try {
      const decodedToken = await authAdmin.verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        displayName: decodedToken.name || null,
        photoURL: decodedToken.picture || null,
        emailVerified: decodedToken.email_verified || false,
      };
    } catch (error) {
      logger.error('Firebase Admin ID token verification failed:', error);
      throw error;
    }
  }
}
