/**
 * Environment Variable Validation
 * Validates all required environment variables at application startup
 * Ensures type safety and provides helpful error messages
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema
 * Defines all required and optional environment variables with validation rules
 */
const envSchema = z.object({
  // ===========================
  // Server Configuration
  // ===========================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // ===========================
  // Database Configuration
  // ===========================
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // MySQL (optional - for migration)
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  MYSQL_DB: z.string().optional(),
  MYSQL_USER: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),

  // ===========================
  // Security Configuration
  // ===========================
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .describe('Secret key for JWT token signing'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  CSRF_SECRET: z
    .string()
    .min(32, 'CSRF_SECRET must be at least 32 characters for security')
    .describe('Secret key for CSRF protection'),

  // ===========================
  // Email Configuration
  // ===========================
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.string().regex(/^\d+$/).transform(Number).default('587'),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().default('FilmFestKit'),

  // ===========================
  // Payment Configuration
  // ===========================
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // ===========================
  // File Storage
  // ===========================
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('104857600'), // 100MB

  // ===========================
  // External Services
  // ===========================
  SENTRY_DSN: z
    .string()
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  REDIS_URL: z
    .string()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url())
    .optional(),

  // Local uploads (optional)
  UPLOAD_PATH: z.string().optional(),

  // ===========================
  // API Configuration
  // ===========================
  API_RATE_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('100'),
  API_RATE_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'), // 15 minutes

  // ===========================
  // Logging
  // ===========================
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),

  // ===========================
  // Feature Flags
  // ===========================
  ENABLE_SWAGGER: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_CORS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  ENABLE_RATE_LIMITING: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
});

/**
 * Validated environment variables type
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * @throws {ZodError} If validation fails
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars: string[] = [];
      const invalidVars: string[] = [];

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (err.code === 'invalid_type' && err.received === 'undefined') {
          missingVars.push(path);
        } else {
          invalidVars.push(`${path}: ${err.message}`);
        }
      });

      console.error('❌ Environment variable validation failed!\n');

      if (missingVars.length > 0) {
        console.error('Missing required variables:');
        missingVars.forEach((v) => console.error(`  - ${v}`));
        console.error('');
      }

      if (invalidVars.length > 0) {
        console.error('Invalid variable values:');
        invalidVars.forEach((v) => console.error(`  - ${v}`));
        console.error('');
      }

      console.error('Please check your .env file and ensure all required variables are set.');
      console.error('See backend/.env.example for reference.\n');

      // Fail fast - don't start the application with invalid config
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Caches the result after first validation
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof Env>(key: K): Env[K] {
  return getEnv()[key];
}

/**
 * Print environment configuration (safe - hides secrets)
 */
export function printEnvConfig(): void {
  const env = getEnv();
  const safeEnv: Record<string, any> = {};

  // List of sensitive keys to hide
  const sensitiveKeys = [
    'JWT_SECRET',
    'CSRF_SECRET',
    'SESSION_SECRET',
    'EMAIL_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'DB_PASSWORD',
    'MYSQL_PASSWORD',
    'DATABASE_URL',
    'REDIS_URL',
    'SENTRY_DSN',
  ];

  Object.entries(env).forEach(([key, value]) => {
    if (sensitiveKeys.includes(key)) {
      safeEnv[key] = value ? '***REDACTED***' : undefined;
    } else {
      safeEnv[key] = value;
    }
  });

  console.log('📋 Environment Configuration:');
  console.log(JSON.stringify(safeEnv, null, 2));
  console.log('');
}

// Auto-validate on import (can be disabled for testing)
if (process.env.SKIP_ENV_VALIDATION !== 'true') {
  validateEnv();

  if (!isProduction()) {
    console.log('✅ Environment variables validated successfully');
  }
}
