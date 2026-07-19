/**
 * Custom API Error Classes
 * Provides standardized error handling across all routes
 */

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

/**
 * Base API Error class
 * All custom errors should extend this class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly field?: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: any,
    field?: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.field = field;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to standardized API response format
   */
  toJSON(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        field: this.field,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * 400 Bad Request
 * Client sent invalid data or malformed request
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details?: any, field?: string) {
    super(400, 'BAD_REQUEST', message, details, field);
  }
}

/**
 * 401 Unauthorized
 * Authentication is required or has failed
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', details?: any) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

/**
 * 403 Forbidden
 * User is authenticated but lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden', details?: any) {
    super(403, 'FORBIDDEN', message, details);
  }
}

/**
 * 404 Not Found
 * Requested resource does not exist
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', id?: string | number) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(404, 'NOT_FOUND', message);
  }
}

/**
 * 409 Conflict
 * Request conflicts with current state (e.g., duplicate resource)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', details?: any, field?: string) {
    super(409, 'CONFLICT', message, details, field);
  }
}

/**
 * 422 Unprocessable Entity
 * Request validation failed
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: any, field?: string) {
    super(422, 'VALIDATION_ERROR', message, details, field);
  }
}

/**
 * 429 Too Many Requests
 * Rate limit exceeded
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, { retryAfter });
  }
}

/**
 * 500 Internal Server Error
 * Unexpected server error
 */
export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', details?: any) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details, undefined, false);
  }
}

/**
 * 503 Service Unavailable
 * Service temporarily unavailable (maintenance, overload, etc.)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable', retryAfter?: number) {
    super(503, 'SERVICE_UNAVAILABLE', message, { retryAfter });
  }
}

/**
 * Database Error
 * Wraps database-related errors
 */
export class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', details?: any) {
    super(500, 'DATABASE_ERROR', message, details, undefined, true);
  }
}

/**
 * File Upload Error
 * File upload related errors
 */
export class FileUploadError extends ApiError {
  constructor(message = 'File upload failed', details?: any, field?: string) {
    super(400, 'FILE_UPLOAD_ERROR', message, details, field);
  }
}

/**
 * Email Error
 * Email sending related errors
 */
export class EmailError extends ApiError {
  constructor(message = 'Failed to send email', details?: any) {
    super(500, 'EMAIL_ERROR', message, details, undefined, true);
  }
}

/**
 * Tenant Error
 * Multi-tenancy related errors
 */
export class TenantError extends ApiError {
  constructor(message = 'Invalid tenant', details?: any) {
    super(400, 'TENANT_ERROR', message, details);
  }
}

/**
 * Payment Error
 * Payment processing related errors
 */
export class PaymentError extends ApiError {
  constructor(message = 'Payment processing failed', details?: any) {
    super(402, 'PAYMENT_ERROR', message, details);
  }
}

/**
 * External Service Error
 * Third-party service integration errors
 */
export class ExternalServiceError extends ApiError {
  constructor(service: string, message = 'External service error', details?: any) {
    super(502, 'EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, details, undefined, true);
  }
}

/**
 * Resource Locked Error
 * Resource is being modified by another process
 */
export class ResourceLockedError extends ApiError {
  constructor(resource = 'Resource', details?: any) {
    super(423, 'RESOURCE_LOCKED', `${resource} is currently locked`, details);
  }
}

/**
 * Error Code Enumeration
 * Centralized list of all error codes used in the application
 */
export enum ErrorCode {
  // General Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Domain-Specific Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  EMAIL_ERROR = 'EMAIL_ERROR',
  TENANT_ERROR = 'TENANT_ERROR',

  // Auth Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Resource Errors
  FESTIVAL_NOT_FOUND = 'FESTIVAL_NOT_FOUND',
  FILM_NOT_FOUND = 'FILM_NOT_FOUND',
  SUBMISSION_NOT_FOUND = 'SUBMISSION_NOT_FOUND',

  // File Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  // Email Errors
  EMAIL_TEMPLATE_NOT_FOUND = 'EMAIL_TEMPLATE_NOT_FOUND',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',

  // Payment Errors
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  STRIPE_ERROR = 'STRIPE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // State Errors
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is operational (expected error)
 */
export function isOperationalError(error: any): boolean {
  if (isApiError(error)) {
    return error.isOperational;
  }
  return false;
}
