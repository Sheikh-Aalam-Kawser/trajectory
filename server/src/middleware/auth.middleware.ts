import { Response, NextFunction } from 'express';
import { AuthVerifier } from '../auth';
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

  try {
    const user = await AuthVerifier.verify(idToken);
    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Authentication error during ID token verification:', error);
    
    // Check if the failure is due to configuration/unavailability
    if (error?.message?.includes('not configured') || error?.message?.includes('not initialized') || error?.message?.includes('unavailable')) {
      res.status(500).json({
        success: false,
        message: 'Server Error: Auth service unavailable',
        errorCode: 'AUTH_SERVICE_UNAVAILABLE'
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      errorCode: 'AUTH_INVALID_TOKEN'
    });
  }
};

