import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../logger';

let dbInstance: admin.firestore.Firestore | null = null;
let authInstance: admin.auth.Auth | null = null;

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      logger.warn('Firebase configuration is incomplete. Firebase Admin will throw errors if accessed.');
      return { db: null, auth: null };
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      logger.info('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      return { db: null, auth: null };
    }
  }

  if (!dbInstance) {
    dbInstance = admin.firestore();
  }
  if (!authInstance) {
    authInstance = admin.auth();
  }

  return { db: dbInstance, auth: authInstance };
}

export const getDb = () => getFirebaseAdmin().db;
export const getAuth = () => getFirebaseAdmin().auth;
export { admin };
