import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * CSRF Protection Middleware
 * Using csrf-csrf library (modern replacement for deprecated csurf)
 */

const {
  generateCsrfToken, // generates a secret + token pair
  validateRequest: _validateRequest, // validates an incoming request (handled by middleware)
  doubleCsrfProtection, // express middleware
} = doubleCsrf({
  getSecret: () => {
    if (!process.env.CSRF_SECRET) {
      throw new Error('CSRF_SECRET environment variable is required');
    }
    return process.env.CSRF_SECRET;
  },
  getSessionIdentifier: (req) => req.ip || 'anonymous',
  cookieName: process.env.CSRF_COOKIE_NAME || '__Host-festscout.x-csrf',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64, // Size of the generated token
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't protect these methods
  getCsrfTokenFromRequest: (req) => {
    // Get token from header or body
    return (req.headers['x-csrf-token'] as string) || req.body?._csrf;
  },
});

/**
 * CSRF Protection middleware for routes
 * Apply to state-changing routes (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Generate and send CSRF token to client
 */
export const csrfTokenEndpoint = (req: Request, res: Response): void => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({
    success: true,
    csrfToken,
    message: 'CSRF token generated successfully',
  });
};

/**
 * Custom CSRF error handler
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('CSRF')) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED',
    });
    return;
  }

  next(err);
};
