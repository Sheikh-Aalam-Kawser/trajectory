import { FirebaseAdminVerifier } from './FirebaseAdminVerifier';
import { JWKSVerifier } from './JWKSVerifier';
import { logger } from '../logger';
import { TrajectoryUser } from '../../../shared/types/auth';

export class AuthVerifier {
  static async verify(token: string): Promise<TrajectoryUser> {
    try {
      logger.info('Attempting token verification with Firebase Admin...');
      return await FirebaseAdminVerifier.verify(token);
    } catch (adminError: any) {
      logger.warn(`Firebase Admin verification failed: ${adminError?.message || adminError}. Falling back to JWKS...`);
      try {
        return await JWKSVerifier.verify(token);
      } catch (jwksError: any) {
        logger.error(`JWKS verification also failed: ${jwksError?.message || jwksError}`);
        throw jwksError;
      }
    }
  }
}
