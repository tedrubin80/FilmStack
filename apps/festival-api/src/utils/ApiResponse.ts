/**
 * Standardized API Response Utilities
 * Provides consistent success response formatting across all routes
 */

import { Response } from 'express';

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

/**
 * Send a standardized success response
 * @param res - Express response object
 * @param data - Data to send in response
 * @param statusCode - HTTP status code (default: 200)
 * @param message - Optional success message
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 * @param res - Express response object
 * @param data - Array of data items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param message - Optional success message
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };

  if (message) {
    response.message = message;
  }

  return res.status(200).json(response);
}

/**
 * Send a created response (201)
 * @param res - Express response object
 * @param data - Created resource data
 * @param message - Optional success message
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, 201, message || 'Resource created successfully');
}

/**
 * Send a no content response (204)
 * @param res - Express response object
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send a custom response with metadata
 * @param res - Express response object
 * @param data - Data to send
 * @param meta - Additional metadata
 * @param statusCode - HTTP status code
 */
export function sendWithMeta<T>(
  res: Response,
  data: T,
  meta: Record<string, any>,
  statusCode: number = 200
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Type-safe response builders (fluent API)
 */
export class ResponseBuilder<T = any> {
  private _data?: T;
  private _statusCode: number = 200;
  private _message?: string;
  private _meta?: Record<string, any>;

  data(data: T): this {
    this._data = data;
    return this;
  }

  status(code: number): this {
    this._statusCode = code;
    return this;
  }

  message(msg: string): this {
    this._message = msg;
    return this;
  }

  meta(meta: Record<string, any>): this {
    this._meta = meta;
    return this;
  }

  send(res: Response): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data: this._data as T,
    };

    if (this._message) {
      response.message = this._message;
    }

    if (this._meta) {
      response.meta = {
        timestamp: new Date().toISOString(),
        ...this._meta,
      };
    }

    return res.status(this._statusCode).json(response);
  }
}

/**
 * Create a new response builder
 */
export function createResponse<T = any>(): ResponseBuilder<T> {
  return new ResponseBuilder<T>();
}
