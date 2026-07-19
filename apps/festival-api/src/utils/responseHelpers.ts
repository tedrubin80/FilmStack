import { Response } from 'express';
import { ValidationError as ExpressValidationError, validationResult } from 'express-validator';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from './ApiError';

/**
 * Standardized API Response Helpers
 * Provides consistent response formatting across all routes
 */

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
}

/**
 * Send a standardized creation success response (201)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send a 400 Bad Request error
 */
export function sendBadRequest(res: Response, message: string, details?: any): Response {
  return sendError(res, 400, 'BAD_REQUEST', message, details);
}

/**
 * Send a 401 Unauthorized error
 */
export function sendUnauthorized(res: Response, message: string = 'Authentication required'): Response {
  return sendError(res, 401, 'UNAUTHORIZED', message);
}

/**
 * Send a 403 Forbidden error
 */
export function sendForbidden(res: Response, message: string = 'Access denied'): Response {
  return sendError(res, 403, 'FORBIDDEN', message);
}

/**
 * Send a 404 Not Found error
 */
export function sendNotFound(res: Response, resource: string = 'Resource'): Response {
  return sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
}

/**
 * Send a 409 Conflict error
 */
export function sendConflict(res: Response, message: string, details?: any): Response {
  return sendError(res, 409, 'CONFLICT', message, details);
}

/**
 * Send a 422 Validation error
 */
export function sendValidationError(
  res: Response,
  errors: ExpressValidationError[] | any[]
): Response {
  return sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', { errors });
}

/**
 * Send a 500 Internal Server error
 */
export function sendServerError(
  res: Response,
  message: string = 'An unexpected error occurred'
): Response {
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Check validation result and send error if invalid
 * Returns true if there are validation errors (meaning the caller should return)
 */
export function handleValidationErrors(req: any, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendValidationError(res, errors.array());
    return true;
  }
  return false;
}

/**
 * Check if user is authenticated and send error if not
 * Returns true if not authenticated (meaning the caller should return)
 */
export function requireAuth(req: any, res: Response): boolean {
  if (!req.user) {
    sendUnauthorized(res);
    return true;
  }
  return false;
}

/**
 * Throw-based error helpers for use with async handlers
 * These throw errors that will be caught by the error middleware
 */
export const throwError = {
  badRequest: (message: string, details?: any, field?: string): never => {
    throw new BadRequestError(message, details, field);
  },

  notFound: (resource: string, id?: string | number): never => {
    throw new NotFoundError(resource, id);
  },

  unauthorized: (message?: string, details?: any): never => {
    throw new UnauthorizedError(message, details);
  },

  forbidden: (message?: string, details?: any): never => {
    throw new ForbiddenError(message, details);
  },

  conflict: (message?: string, details?: any, field?: string): never => {
    throw new ConflictError(message, details, field);
  },

  validation: (message?: string, details?: any, field?: string): never => {
    throw new ValidationError(message, details, field);
  },
};

/**
 * Standard pagination response helper
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore?: boolean;
  }
): Response {
  return res.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      hasMore: pagination.hasMore ?? pagination.page * pagination.limit < pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

export default {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendServerError,
  handleValidationErrors,
  requireAuth,
  throwError,
  sendPaginated,
};
