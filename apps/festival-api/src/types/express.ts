/**
 * Enhanced Express types for better TypeScript strict mode compliance
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Type-safe route handler
 */
export type RouteHandler<TRequest extends Request = Request, TResponse = any> = (
  req: TRequest,
  res: Response<TResponse>,
  next: NextFunction
) => Promise<void> | void;

/**
 * Type-safe authenticated route handler
 */
export type AuthenticatedRouteHandler<TResponse = any> = RouteHandler<
  AuthenticatedRequest,
  TResponse
>;

/**
 * Helper to safely parse integer from request params
 */
export function parseIntParam(value: string | undefined, paramName: string): number {
  if (!value) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${paramName}: must be a valid integer`);
  }

  return parsed;
}

/**
 * Helper to safely get string param
 */
export function getStringParam(value: string | undefined, paramName: string): string {
  if (!value) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }
  return value;
}
