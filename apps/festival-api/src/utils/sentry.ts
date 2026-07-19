/**
 * Sentry Error Monitoring Configuration
 * Provides error tracking, performance monitoring, and profiling
 * Compatible with Sentry SDK v8+
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { getEnv } from '../config/env';

const env = getEnv();

/**
 * Initialize Sentry with the application configuration
 */
export const initSentry = (): void => {
  const dsn = env.SENTRY_DSN;

  if (!dsn) {
    console.log('⚠️ Sentry DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    release: process.env.npm_package_version || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data?.password) {
            breadcrumb.data.password = '[REDACTED]';
          }
          if (breadcrumb.data?.token) {
            breadcrumb.data.token = '[REDACTED]';
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      /^NetworkError/,
      /^Request aborted/,
    ],
  });

  console.log('✅ Sentry error monitoring initialized');
};

/**
 * Setup Sentry request handlers for Express (v8 compatible)
 */
export const setupSentryHandlers = (app: Express): void => {
  if (!env.SENTRY_DSN) {
    return;
  }

  // In Sentry v8, we use setupExpressErrorHandler after routes
  // Request context is automatically captured
  Sentry.setupExpressErrorHandler(app);
};

/**
 * Setup Sentry error handler (v8 compatible - can be empty as setupExpressErrorHandler handles it)
 */
export const setupSentryErrorHandler = (_app: Express): void => {
  // In Sentry v8, error handling is done via setupExpressErrorHandler
  // which should be called after all routes are defined
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>): string => {
  if (!env.SENTRY_DSN) {
    console.error('Error (Sentry disabled):', error);
    return '';
  }

  return Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message manually
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info'): string => {
  if (!env.SENTRY_DSN) {
    console.log(`Message (Sentry disabled): ${message}`);
    return '';
  }

  return Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; tenantId?: number }): void => {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
};

/**
 * Clear user context
 */
export const clearUser = (): void => {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Flush pending events before shutdown
 */
export const flushSentry = async (timeout: number = 2000): Promise<boolean> => {
  if (!env.SENTRY_DSN) {
    return true;
  }

  return Sentry.flush(timeout);
};

/**
 * Express error handler middleware for Sentry
 */
export const sentryErrorMiddleware: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  next(err);
};
