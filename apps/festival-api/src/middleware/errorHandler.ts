import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import {
  ApiError,
  isApiError,
  isOperationalError as _isOperationalError, // Exported for external use if needed
  ErrorResponse,
  InternalServerError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  DatabaseError,
  FileUploadError,
} from '../utils/ApiError';

/**
 * Global error handling middleware
 * Converts all errors to standardized API error responses
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    next(err);
    return;
  }

  // Convert known error types to ApiError instances
  let apiError: ApiError;

  if (isApiError(err)) {
    apiError = err;
  } else {
    // Handle specific error types (Prisma, JWT, Multer, etc.)
    apiError = convertToApiError(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Log error based on severity
  if (apiError.statusCode >= 500) {
    // Server errors - always log with full details
    logger.error('Server Error', {
      requestId: req.id,
      code: apiError.code,
      message: apiError.message,
      stack: apiError.stack,
      statusCode: apiError.statusCode,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      params: req.params,
      query: req.query,
      isOperational: apiError.isOperational,
    });
  } else if (apiError.statusCode >= 400) {
    // Client errors - log as warning
    logger.warn('Client Error', {
      requestId: req.id,
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  // Build standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.path,
    },
  };

  // Add optional fields if present
  if (apiError.details) {
    errorResponse.error.details = apiError.details;
  }

  if (apiError.field) {
    errorResponse.error.field = apiError.field;
  }

  // Include stack trace in development for debugging (no request body to avoid leaking passwords)
  if (!isProduction && apiError.stack) {
    errorResponse.error.details = {
      ...errorResponse.error.details,
      stack: apiError.stack,
      method: req.method,
      params: req.params,
      query: req.query,
    };
  }

  // Send standardized error response
  res.status(apiError.statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Use this as the last middleware to catch all unmatched routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  logger.warn('404 Not Found', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  const error = new NotFoundError('Endpoint');
  error.message = `Cannot ${req.method} ${req.path}`;

  // Pass to error handler for consistent formatting
  next(error);
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to automatically catch errors and pass to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Convert known error types to ApiError instances
 * Handles Prisma, JWT, Multer, and validation errors
 */
function convertToApiError(err: any): ApiError {
  // Prisma database errors
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target[0] : target;
        return new ConflictError(
          'A record with this information already exists',
          { fields: target },
          field
        );
      case 'P2025': // Record not found
        return new NotFoundError('Record');
      case 'P2003': // Foreign key constraint failed
        return new BadRequestError('Foreign key constraint failed', {
          constraint: err.meta?.field_name,
        });
      case 'P2014': // Invalid ID
        return new BadRequestError('Invalid ID provided');
      case 'P2021': // Table does not exist
        return new DatabaseError('Table does not exist', { table: err.meta?.table });
      case 'P2022': // Column does not exist
        return new DatabaseError('Column does not exist', { column: err.meta?.column });
      default:
        return new DatabaseError('Database operation failed', { code: err.code });
    }
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    return new BadRequestError('Invalid data provided', { validation: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid authentication token', { reason: err.message });
  }

  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Authentication token has expired', {
      expiredAt: err.expiredAt,
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return new FileUploadError(
          'File size exceeds maximum limit',
          { maxSize: '100MB' },
          err.field
        );
      case 'LIMIT_FILE_COUNT':
        return new FileUploadError('Too many files uploaded', undefined, err.field);
      case 'LIMIT_UNEXPECTED_FILE':
        return new FileUploadError('Unexpected file field', undefined, err.field);
      case 'LIMIT_PART_COUNT':
        return new FileUploadError('Too many parts in multipart upload');
      default:
        return new FileUploadError(err.message, undefined, err.field);
    }
  }

  // Express validation errors (express-validator)
  if (err.name === 'ValidationError' || err.array) {
    const errors = err.array ? err.array() : [{ msg: err.message }];
    return new BadRequestError('Validation failed', { errors });
  }

  // Check if error has statusCode (legacy errors)
  if (err.statusCode && err.message) {
    return new ApiError(err.statusCode, err.code || 'LEGACY_ERROR', err.message, err.details);
  }

  // Default: treat as internal server error
  return new InternalServerError(
    isProduction() ? 'An unexpected error occurred' : err.message,
    isProduction() ? undefined : { originalError: err.message, stack: err.stack }
  );
}

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
