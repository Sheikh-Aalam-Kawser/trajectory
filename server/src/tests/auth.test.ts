import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthVerifier, FirebaseAdminVerifier, JWKSVerifier } from '../auth';
import { authenticate } from '../middleware/auth.middleware';
import { getAuth } from '../config/firebase';
import { jwtVerify } from 'jose';

// Mock getAuth from '../config/firebase'
vi.mock('../config/firebase', () => ({
  getAuth: vi.fn(),
  getFirebaseAdmin: vi.fn(() => ({ db: {}, auth: {} })),
}));

// Mock jwtVerify from 'jose'
vi.mock('jose', async () => {
  const actual = await vi.importActual<any>('jose');
  return {
    ...actual,
    jwtVerify: vi.fn(),
  };
});

describe('Authentication Layer Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FirebaseAdminVerifier', () => {
    it('successfully verifies a valid ID token via Firebase Admin SDK', async () => {
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        uid: 'user-admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        picture: 'https://example.com/pic.png',
        email_verified: true,
      });

      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const user = await FirebaseAdminVerifier.verify('valid-admin-token');
      expect(user).toEqual({
        uid: 'user-admin-123',
        email: 'admin@example.com',
        displayName: 'Admin User',
        photoURL: 'https://example.com/pic.png',
        emailVerified: true,
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-admin-token');
    });

    it('throws an error if Firebase Admin is not configured', async () => {
      vi.mocked(getAuth).mockReturnValue(null);

      await expect(FirebaseAdminVerifier.verify('some-token')).rejects.toThrow(
        'FirebaseAdminVerifier: Firebase Admin Auth is not configured or available'
      );
    });

    it('propagates the error if token verification fails', async () => {
      const mockVerifyIdToken = vi.fn().mockRejectedValue(new Error('Token expired'));
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      await expect(FirebaseAdminVerifier.verify('expired-token')).rejects.toThrow('Token expired');
    });
  });

  describe('JWKSVerifier', () => {
    it('successfully verifies a token via Google public JWKS', async () => {
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: 'user-jwks-123',
          email: 'jwks@example.com',
          name: 'JWKS User',
          picture: 'https://example.com/pic-jwks.png',
          email_verified: true,
        },
        protectedHeader: { alg: 'RS256' },
      } as any);

      const user = await JWKSVerifier.verify('valid-jwks-token');
      expect(user).toEqual({
        uid: 'user-jwks-123',
        email: 'jwks@example.com',
        displayName: 'JWKS User',
        photoURL: 'https://example.com/pic-jwks.png',
        emailVerified: true,
      });
      expect(jwtVerify).toHaveBeenCalled();
    });

    it('propagates the error if JWKS verification fails', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid signature'));

      await expect(JWKSVerifier.verify('invalid-jwks-token')).rejects.toThrow('Invalid signature');
    });
  });

  describe('AuthVerifier Orchestration', () => {
    it('returns user from Firebase Admin if both are available and token is valid', async () => {
      // Admin Mock
      const mockVerifyIdToken = vi.fn().mockResolvedValue({
        uid: 'admin-ok',
        email: 'admin-ok@example.com',
        name: 'Admin OK',
        picture: null,
        email_verified: true,
      });
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const user = await AuthVerifier.verify('good-token');
      expect(user.uid).toBe('admin-ok');
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it('automatically falls back to JWKS verification if Firebase Admin is unavailable', async () => {
      // Admin is not available
      vi.mocked(getAuth).mockReturnValue(null);

      // JWKS is available and succeeds
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: 'jwks-fallback',
          email: 'fallback@example.com',
          name: 'Fallback User',
          picture: null,
          email_verified: false,
        },
        protectedHeader: { alg: 'RS256' },
      } as any);

      const user = await AuthVerifier.verify('token-to-fallback');
      expect(user.uid).toBe('jwks-fallback');
      expect(jwtVerify).toHaveBeenCalled();
    });

    it('automatically falls back to JWKS verification if Firebase Admin verification throws an error', async () => {
      // Admin throws error
      const mockVerifyIdToken = vi.fn().mockRejectedValue(new Error('Admin error'));
      vi.mocked(getAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      // JWKS succeeds
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: 'jwks-fallback-from-error',
          email: 'fallback-err@example.com',
          name: 'Fallback Err User',
          picture: null,
          email_verified: true,
        },
        protectedHeader: { alg: 'RS256' },
      } as any);

      const user = await AuthVerifier.verify('token-causing-admin-error');
      expect(user.uid).toBe('jwks-fallback-from-error');
      expect(jwtVerify).toHaveBeenCalled();
    });

    it('throws error if both Firebase Admin and JWKS verifications fail', async () => {
      // Admin fails
      vi.mocked(getAuth).mockReturnValue(null);

      // JWKS fails
      vi.mocked(jwtVerify).mockRejectedValue(new Error('JWKS verification failed'));

      await expect(AuthVerifier.verify('completely-invalid-token')).rejects.toThrow('JWKS verification failed');
    });
  });

  describe('authenticate Middleware integration', () => {
    it('successfully authenticates with valid token and calls next()', async () => {
      // Mock AuthVerifier
      vi.mocked(getAuth).mockReturnValue(null);
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          sub: 'middleware-user',
          email: 'mid@example.com',
          name: 'Mid User',
          picture: null,
          email_verified: true,
        },
        protectedHeader: { alg: 'RS256' },
      } as any);

      const req: any = {
        headers: {
          authorization: 'Bearer valid-id-token',
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.uid).toBe('middleware-user');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 AUTH_MISSING_TOKEN when authorization header is missing', async () => {
      const req: any = {
        headers: {},
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized: No token provided',
        errorCode: 'AUTH_MISSING_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 AUTH_MISSING_TOKEN when authorization header does not start with Bearer', async () => {
      const req: any = {
        headers: {
          authorization: 'Basic dGVzdDp0ZXN0',
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized: No token provided',
        errorCode: 'AUTH_MISSING_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 AUTH_INVALID_TOKEN when token is invalid or expired', async () => {
      vi.mocked(getAuth).mockReturnValue(null);
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Token is bad'));

      const req: any = {
        headers: {
          authorization: 'Bearer bad-token',
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized: Invalid or expired token',
        errorCode: 'AUTH_INVALID_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
