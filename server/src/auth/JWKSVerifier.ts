import { jwtVerify, createRemoteJWKSet } from 'jose';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../logger';
import { TrajectoryUser } from '../../../shared/types/auth';

let projectId: string | undefined;

// Safe load of firebase-applet-config.json to extract projectId
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    projectId = localConfig.projectId;
  }
} catch (e) {
  // Ignore
}

// Fallback to env variable
projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || projectId;

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export class JWKSVerifier {
  static async verify(token: string): Promise<TrajectoryUser> {
    if (!projectId) {
      throw new Error('JWKSVerifier: Firebase Project ID is not configured');
    }

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });

      return {
        uid: payload.sub!,
        email: (payload.email as string) || null,
        displayName: (payload.name as string) || null,
        photoURL: (payload.picture as string) || null,
        emailVerified: (payload.email_verified as boolean) || false,
      };
    } catch (error) {
      logger.error('JWKS Verification failed:', error);
      throw error;
    }
  }
}
