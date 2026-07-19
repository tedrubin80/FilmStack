/**
 * Redis Client Configuration
 * Provides caching functionality for improved performance
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { getEnv } from './env';

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

/**
 * Initialize Redis client
 */
export function initRedis(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const env = getEnv();

  // Redis is optional - only initialize if URL is provided
  if (!env.REDIS_URL) {
    logger.info('Redis not configured - caching disabled');
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedis(): Redis | null {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}
