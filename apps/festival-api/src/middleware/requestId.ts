import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include id
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Request ID middleware
 * Generates a unique ID for each request for tracing and debugging.
 * If the request already contains an X-Request-ID header (e.g., from a reverse proxy),
 * that value is reused to allow end-to-end tracing.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'] as string | undefined;
  req.id = existingId || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};
