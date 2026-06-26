import { initializeApp, getApps, cert } from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { env } from './env';
import { logger } from '../logger';

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Safe load of firebase-applet-config.json
let localConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  // Ignore
}

export function getFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || localConfig.projectId;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId) {
      logger.warn('Firebase Project ID is missing. Firebase Admin cannot be initialized.');
      return { db: null, auth: null };
    }

    try {
      if (clientEmail && privateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        logger.info('Firebase Admin SDK initialized successfully with Service Account credentials.');
      } else {
        // Initialize using project ID only (which allows token verification and falls back to ADC in Google Cloud/Cloud Run)
        initializeApp({
          projectId,
        });
        logger.info(`Firebase Admin SDK initialized with Project ID: ${projectId} (credentials-free mode).`);
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      return { db: null, auth: null };
    }
  }

  const databaseId = localConfig.firestoreDatabaseId;

  if (!dbInstance) {
    try {
      dbInstance = databaseId && databaseId !== '(default)' && databaseId !== ''
        ? getFirestore(databaseId)
        : getFirestore();
    } catch (e) {
      logger.error('Failed to get Firestore instance:', e);
    }
  }
  if (!authInstance) {
    try {
      authInstance = getAuth();
    } catch (e) {
      logger.error('Failed to get Auth instance:', e);
    }
  }

  return { db: dbInstance, auth: authInstance };
}

export const getDb = () => getFirebaseAdmin().db;
export const getAuth = () => getFirebaseAdmin().auth;
export { admin };
