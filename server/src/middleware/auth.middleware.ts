import { Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { AuthenticatedRequest, StandardAPIResponse } from '../types';
import { logger } from '../logger';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response<StandardAPIResponse>,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Authentication failed: No token provided');
    res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided',
      errorCode: 'AUTH_MISSING_TOKEN'
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  const authAdmin = getAuth();

  if (!authAdmin) {
    logger.error('Authentication configuration error: Firebase Admin Auth is not configured');
    res.status(500).json({
      success: false,
      message: 'Server Error: Auth service unavailable',
      errorCode: 'AUTH_SERVICE_UNAVAILABLE'
    });
    return;
  }

  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified || false,
    };

    next();
  } catch (error) {
    logger.error('Authentication error during ID token verification:', error);
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      errorCode: 'AUTH_INVALID_TOKEN'
    });
  }
};
