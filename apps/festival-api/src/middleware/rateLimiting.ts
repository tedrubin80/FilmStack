import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate Limiting Middleware
 * Tiered approach based on endpoint sensitivity
 */

/**
 * Standard rate limit handler
 */
const rateLimitHandler = (req: Request, res: Response) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Strict rate limiting for authentication endpoints
 * 5 attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false, // Count all requests
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * Moderate rate limiting for API write operations
 * 100 requests per 15 minutes
 */
export const apiWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_WRITE_RATE_LIMIT || '100'),
  message: {
    error: 'Too many requests',
    message: 'API write rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * Lenient rate limiting for read operations
 * 1000 requests per 15 minutes
 */
export const apiReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_READ_RATE_LIMIT || '1000'),
  message: {
    error: 'Too many requests',
    message: 'API read rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.method !== 'GET' && req.method !== 'HEAD',
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * Very strict rate limiting for file uploads
 * 20 uploads per hour
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || '20'),
  message: {
    error: 'Too many file uploads',
    message: 'Upload rate limit exceeded. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * Strict rate limiting for password reset endpoints
 * 3 attempts per hour
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again in an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * Email sending rate limiter
 * 50 emails per hour per tenant
 */
export const emailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.EMAIL_RATE_LIMIT || '50'),
  message: {
    error: 'Too many emails sent',
    message: 'Email rate limit exceeded. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: any) => {
    // Use tenant ID as key for multi-tenant rate limiting
    return req.tenant?.id?.toString() || req.ip || 'unknown';
  },
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});

/**
 * General API rate limiter
 * 500 requests per 15 minutes
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.GENERAL_RATE_LIMIT || '500'),
  message: {
    error: 'Too many requests',
    message: 'General rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { trustProxy: false }, // We trust our nginx proxy configuration
});
