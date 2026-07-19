import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@filmstack/shared-auth';
import { logger } from '../utils/logger';
import { getRedis, isRedisAvailable } from '../config/redis';

const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
});

export { authService };

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    tenantId: number;
    tenantSubdomain: string;
    role: string;
  };
}

/**
 * Authentication middleware — verifies JWT access tokens.
 * Checks Redis blacklist for revoked tokens.
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Check token blacklist (logout support)
    if (isRedisAvailable()) {
      try {
        const redis = getRedis()!;
        const blacklisted = await redis.get(`token_blacklist:${token}`);
        if (blacklisted) {
          res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked' });
          return;
        }
      } catch (redisErr) {
        logger.warn('Redis token blacklist check failed:', redisErr);
      }
    }

    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
      return;
    }

    req.user = {
      userId: typeof decoded.userId === 'string' ? parseInt(decoded.userId, 10) : decoded.userId as unknown as number,
      username: decoded.username,
      email: decoded.email,
      tenantId: typeof decoded.tenantId === 'string' ? parseInt(decoded.tenantId, 10) : (decoded.tenantId as unknown as number) || 0,
      tenantSubdomain: decoded.tenantSubdomain || '',
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
  }
};

/**
 * Role-based authorization middleware.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
