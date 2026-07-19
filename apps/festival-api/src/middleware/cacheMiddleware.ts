/**
 * Cache Middleware
 * Automatically cache GET request responses
 */

import { Request, Response, NextFunction } from 'express';
import { getCached, setCached, CacheTTL } from '../utils/cache';
import { logger } from '../utils/logger';

/**
 * Cache middleware options
 */
export interface CacheMiddlewareOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Function to generate cache key (default: req.originalUrl)
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Condition to determine if response should be cached
   */
  shouldCache?: (req: Request, res: Response) => boolean;

  /**
   * Whether to include tenant ID in cache key
   */
  includeTenant?: boolean;
}

/**
 * Create cache middleware for route
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const { ttl = CacheTTL.FIVE_MINUTES, keyGenerator, shouldCache, includeTenant = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    let cacheKey: string;
    if (keyGenerator) {
      cacheKey = keyGenerator(req);
    } else {
      // Default: use full URL including query params
      const tenant = includeTenant && (req as any).tenant?.id;
      const tenantPrefix = tenant ? `tenant:${tenant}:` : '';
      cacheKey = `${tenantPrefix}${req.originalUrl}`;
    }

    try {
      // Try to get from cache
      const cached = await getCached<any>(cacheKey);

      if (cached !== null) {
        logger.debug('Cache hit', { key: cacheKey, url: req.originalUrl });

        // Set cache header
        res.setHeader('X-Cache', 'HIT');

        // Send cached response
        return res.json(cached);
      }

      logger.debug('Cache miss', { key: cacheKey, url: req.originalUrl });

      // Set cache header
      res.setHeader('X-Cache', 'MISS');

      // Capture the response
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        // Check if we should cache this response
        const canCache = shouldCache ? shouldCache(req, res) : res.statusCode === 200;

        if (canCache) {
          // Cache the response (fire and forget)
          setCached(cacheKey, data, ttl).catch((err) => {
            logger.warn('Failed to cache response:', { key: cacheKey, error: err });
          });
        }

        // Send response
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.warn('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Simple cache middleware with default settings
 * @param ttl Time to live in seconds
 */
export function simpleCache(ttl: number = CacheTTL.FIVE_MINUTES) {
  return cacheMiddleware({ ttl });
}

/**
 * Cache middleware for list endpoints with pagination
 */
export function cacheList(ttl: number = CacheTTL.FIVE_MINUTES) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const tenant = (req as any).tenant?.id || 'no-tenant';
      const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
      return `list:${tenant}:${req.path}:p${page}:l${limit}:s${search}:st${status}`;
    },
  });
}

/**
 * Cache middleware for single item by ID
 */
export function cacheById(prefix: string, ttl: number = CacheTTL.FIFTEEN_MINUTES) {
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const tenant = (req as any).tenant?.id || 'no-tenant';
      const id = req.params.id;
      return `${prefix}:${tenant}:${id}`;
    },
  });
}
