/**
 * Error Message Utilities
 * Maps error codes to user-friendly messages
 */

interface ApiError {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        details?: any[];
      };
    };
    status?: number;
  };
  message?: string;
}

/**
 * User-friendly error message mappings
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication Errors
  UNAUTHORIZED: 'Please log in to continue.',
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Your session is invalid. Please log in again.',

  // Validation Errors
  VALIDATION_ERROR: 'Please check the form and correct any errors.',
  MISSING_FIELD: 'Please fill in all required fields.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid phone number.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
  PASSWORD_TOO_WEAK: 'Password must include letters, numbers, and special characters.',

  // Resource Errors
  NOT_FOUND: 'The requested item could not be found.',
  FESTIVAL_NOT_FOUND: 'This festival could not be found.',
  FILM_NOT_FOUND: 'This film could not be found.',
  USER_NOT_FOUND: 'This user could not be found.',

  // Conflict Errors
  CONFLICT: 'This action conflicts with existing data.',
  SUBDOMAIN_TAKEN: 'This subdomain is already taken. Please choose another.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USERNAME_TAKEN: 'This username is already taken. Please choose another.',
  DUPLICATE_ENTRY: 'This item already exists.',

  // Permission Errors
  FORBIDDEN: "You don't have permission to perform this action.",
  TENANT_MISMATCH: "You don't have access to this resource.",
  INSUFFICIENT_PERMISSIONS: "You don't have the required permissions.",

  // File Upload Errors
  FILE_TOO_LARGE: 'The file you uploaded is too large. Maximum size is 100MB.',
  INVALID_FILE_TYPE: 'This file type is not supported. Please upload a valid file.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',

  // Payment Errors
  PAYMENT_ERROR: 'Payment processing failed. Please try again.',
  PAYMENT_DECLINED: 'Your payment was declined. Please check your card details.',
  INSUFFICIENT_FUNDS: 'Insufficient funds. Please use a different payment method.',
  STRIPE_ERROR: 'Payment processing error. Please try again or contact support.',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please try again later.',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  DATABASE_ERROR: 'A database error occurred. Please try again.',
  EXTERNAL_SERVICE_ERROR: 'An external service is unavailable. Please try again later.',

  // Network Errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
};

/**
 * Get user-friendly error message from API error
 */
export function getErrorMessage(error: any): string {
  // Handle API errors with error codes
  if (error?.response?.data?.error?.code) {
    const code = error.response.data.error.code;
    return ERROR_MESSAGES[code] || error.response.data.error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  }

  // Handle API errors with direct messages
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Handle HTTP status codes
  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.FORBIDDEN;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 409:
        return ERROR_MESSAGES.CONFLICT;
      case 422:
        return ERROR_MESSAGES.VALIDATION_ERROR;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
      case 500:
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      case 503:
        return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      default:
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    }
  }

  // Handle network errors
  if (error?.message === 'Network Error') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Handle timeout errors
  if (error?.code === 'ECONNABORTED') {
    return ERROR_MESSAGES.TIMEOUT;
  }

  // Fallback
  return error?.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
}

/**
 * Get error details array from validation errors
 */
export function getErrorDetails(error: any): string[] | undefined {
  const details = error?.response?.data?.error?.details;

  if (!details || !Array.isArray(details)) {
    return undefined;
  }

  return details.map((detail: any) => {
    if (typeof detail === 'string') {
      return detail;
    }
    if (detail.message) {
      return detail.message;
    }
    if (detail.field && detail.message) {
      return `${detail.field}: ${detail.message}`;
    }
    return 'Validation error';
  });
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  const code = error?.response?.data?.error?.code;
  const status = error?.response?.status;

  return (
    code === 'UNAUTHORIZED' ||
    code === 'TOKEN_EXPIRED' ||
    code === 'INVALID_TOKEN' ||
    status === 401
  );
}

/**
 * Check if error requires retry
 */
export function isRetryableError(error: any): boolean {
  const code = error?.response?.data?.error?.code;
  const status = error?.response?.status;

  return (
    code === 'NETWORK_ERROR' ||
    code === 'TIMEOUT' ||
    code === 'SERVICE_UNAVAILABLE' ||
    status === 503 ||
    status === 504 ||
    error?.message === 'Network Error'
  );
}

/**
 * Format error for display
 */
export interface FormattedError {
  title: string;
  message: string;
  details?: string[];
  canRetry: boolean;
  isAuth: boolean;
}

export function formatError(error: any): FormattedError {
  return {
    title: getErrorTitle(error),
    message: getErrorMessage(error),
    details: getErrorDetails(error),
    canRetry: isRetryableError(error),
    isAuth: isAuthError(error),
  };
}

/**
 * Get error title based on type
 */
function getErrorTitle(error: any): string {
  const status = error?.response?.status;

  if (isAuthError(error)) {
    return 'Authentication Required';
  }

  if (status === 404) {
    return 'Not Found';
  }

  if (status === 403) {
    return 'Permission Denied';
  }

  if (status === 422 || status === 400) {
    return 'Validation Error';
  }

  if (status === 429) {
    return 'Too Many Requests';
  }

  if (status >= 500) {
    return 'Server Error';
  }

  return 'Error';
}
