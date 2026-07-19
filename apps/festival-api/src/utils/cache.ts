/**
 * Caching Utilities
 * Provides high-level caching functions with fallback when Redis is unavailable
 */

import { getRedis, isRedisAvailable } from '../config/redis';
import { logger } from './logger';

/**
 * Default cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

/**
 * Cache key prefixes for different data types
 */
export const CachePrefix = {
  FESTIVAL: 'festival:',
  FESTIVALS_LIST: 'festivals:list:',
  FILM: 'film:',
  FILMS_LIST: 'films:list:',
  USER: 'user:',
  TENANT: 'tenant:',
  STATS: 'stats:',
} as const;

/**
 * Get value from cache
 * @param key Cache key
 * @returns Parsed value or null if not found
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return null;
    }

    const value = await redis.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn('Cache get error:', { key, error });
    return null;
  }
}

/**
 * Set value in cache
 * @param key Cache key
 * @param value Value to cache (will be JSON stringified)
 * @param ttl Time to live in seconds (default: 5 minutes)
 */
export async function setCached(
  key: string,
  value: any,
  ttl: number = CacheTTL.FIVE_MINUTES
): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    const serialized = JSON.stringify(value);
    await redis.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    logger.warn('Cache set error:', { key, error });
    return false;
  }
}

/**
 * Delete value from cache
 * @param key Cache key
 */
export async function deleteCached(key: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }

    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn('Cache delete error:', { key, error });
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * @param pattern Pattern to match (e.g., "festivals:*")
 */
export async function deleteCachedPattern(pattern: string): Promise<number> {
  if (!isRedisAvailable()) {
    return 0;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return 0;
    }

    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    logger.warn('Cache pattern delete error:', { pattern, error });
    return 0;
  }
}

/**
 * Cache-aside pattern: Get from cache or compute and cache
 * @param key Cache key
 * @param computeFn Function to compute value if not cached
 * @param ttl Time to live in seconds
 */
export async function getOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number = CacheTTL.FIVE_MINUTES
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key);
  if (cached !== null) {
    logger.debug('Cache hit', { key });
    return cached;
  }

  // Cache miss - compute value
  logger.debug('Cache miss', { key });
  const value = await computeFn();

  // Store in cache (don't await - fire and forget)
  setCached(key, value, ttl).catch((err) => {
    logger.warn('Failed to cache computed value:', { key, error: err });
  });

  return value;
}

/**
 * Build cache key for tenant-specific data
 * @param prefix Cache prefix
 * @param tenantId Tenant ID
 * @param suffix Additional key parts
 */
export function buildCacheKey(
  prefix: string,
  tenantId: number,
  ...suffix: (string | number)[]
): string {
  return `${prefix}${tenantId}:${suffix.join(':')}`;
}

/**
 * Invalidate all cache for a tenant
 * @param tenantId Tenant ID
 */
export async function invalidateTenantCache(tenantId: number): Promise<number> {
  const pattern = `*:${tenantId}:*`;
  const deleted = await deleteCachedPattern(pattern);
  logger.info('Invalidated tenant cache', { tenantId, keysDeleted: deleted });
  return deleted;
}

/**
 * Cache statistics
 */
export async function getCacheStats(): Promise<{
  available: boolean;
  keys?: number;
  memory?: string;
}> {
  if (!isRedisAvailable()) {
    return { available: false };
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return { available: false };
    }

    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();

    // Parse memory usage from INFO
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memory = memoryMatch ? memoryMatch[1] : 'unknown';

    return {
      available: true,
      keys: dbsize,
      memory,
    };
  } catch (error) {
    logger.warn('Failed to get cache stats:', error);
    return { available: false };
  }
}
