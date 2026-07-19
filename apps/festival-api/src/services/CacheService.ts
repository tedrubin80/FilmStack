/**
 * Cache Service
 * High-level caching service for application data
 */

import {
  getCached,
  setCached,
  deleteCached,
  deleteCachedPattern,
  getOrCompute,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
  getCacheStats,
} from '../utils/cache';
import { logger } from '../utils/logger';

/**
 * Festival cache operations
 */
export const FestivalCache = {
  /**
   * Get festival by ID from cache
   */
  async get(tenantId: number, festivalId: number) {
    const key = buildCacheKey(CachePrefix.FESTIVAL, tenantId, festivalId);
    return getCached(key);
  },

  /**
   * Set festival in cache
   */
  async set(tenantId: number, festivalId: number, data: any) {
    const key = buildCacheKey(CachePrefix.FESTIVAL, tenantId, festivalId);
    return setCached(key, data, CacheTTL.FIFTEEN_MINUTES);
  },

  /**
   * Invalidate single festival
   */
  async invalidate(tenantId: number, festivalId: number) {
    const key = buildCacheKey(CachePrefix.FESTIVAL, tenantId, festivalId);
    await deleteCached(key);
    // Also invalidate list caches
    await deleteCachedPattern(`${CachePrefix.FESTIVALS_LIST}${tenantId}:*`);
    logger.debug('Festival cache invalidated', { tenantId, festivalId });
  },

  /**
   * Invalidate all festivals for a tenant
   */
  async invalidateAll(tenantId: number) {
    await deleteCachedPattern(`${CachePrefix.FESTIVAL}${tenantId}:*`);
    await deleteCachedPattern(`${CachePrefix.FESTIVALS_LIST}${tenantId}:*`);
    logger.debug('All festival caches invalidated', { tenantId });
  },

  /**
   * Get festivals list from cache or compute
   */
  async getList(
    tenantId: number,
    params: { page: number; limit: number; search?: string; status?: string },
    computeFn: () => Promise<any>
  ) {
    const key = buildCacheKey(
      CachePrefix.FESTIVALS_LIST,
      tenantId,
      `p${params.page}`,
      `l${params.limit}`,
      `s${params.search || ''}`,
      `st${params.status || 'all'}`
    );
    return getOrCompute(key, computeFn, CacheTTL.FIVE_MINUTES);
  },
};

/**
 * Film cache operations
 */
export const FilmCache = {
  /**
   * Get film by ID from cache
   */
  async get(tenantId: number, filmId: number) {
    const key = buildCacheKey(CachePrefix.FILM, tenantId, filmId);
    return getCached(key);
  },

  /**
   * Set film in cache
   */
  async set(tenantId: number, filmId: number, data: any) {
    const key = buildCacheKey(CachePrefix.FILM, tenantId, filmId);
    return setCached(key, data, CacheTTL.FIFTEEN_MINUTES);
  },

  /**
   * Invalidate single film
   */
  async invalidate(tenantId: number, filmId: number) {
    const key = buildCacheKey(CachePrefix.FILM, tenantId, filmId);
    await deleteCached(key);
    // Also invalidate list caches
    await deleteCachedPattern(`${CachePrefix.FILMS_LIST}${tenantId}:*`);
    logger.debug('Film cache invalidated', { tenantId, filmId });
  },

  /**
   * Invalidate all films for a tenant
   */
  async invalidateAll(tenantId: number) {
    await deleteCachedPattern(`${CachePrefix.FILM}${tenantId}:*`);
    await deleteCachedPattern(`${CachePrefix.FILMS_LIST}${tenantId}:*`);
    logger.debug('All film caches invalidated', { tenantId });
  },

  /**
   * Get films list from cache or compute
   */
  async getList(
    tenantId: number,
    params: { page: number; limit: number; festivalId?: number; status?: string; search?: string },
    computeFn: () => Promise<any>
  ) {
    const key = buildCacheKey(
      CachePrefix.FILMS_LIST,
      tenantId,
      `p${params.page}`,
      `l${params.limit}`,
      `f${params.festivalId || 'all'}`,
      `st${params.status || 'all'}`,
      `s${params.search || ''}`
    );
    return getOrCompute(key, computeFn, CacheTTL.FIVE_MINUTES);
  },
};

/**
 * Tenant cache operations
 */
export const TenantCache = {
  /**
   * Get tenant settings from cache
   */
  async getSettings(tenantId: number) {
    const key = buildCacheKey(CachePrefix.TENANT, tenantId, 'settings');
    return getCached(key);
  },

  /**
   * Set tenant settings in cache
   */
  async setSettings(tenantId: number, data: any) {
    const key = buildCacheKey(CachePrefix.TENANT, tenantId, 'settings');
    return setCached(key, data, CacheTTL.ONE_HOUR);
  },

  /**
   * Invalidate tenant cache
   */
  async invalidate(tenantId: number) {
    await deleteCachedPattern(`${CachePrefix.TENANT}${tenantId}:*`);
    logger.debug('Tenant cache invalidated', { tenantId });
  },
};

/**
 * Statistics cache operations
 */
export const StatsCache = {
  /**
   * Get festival stats from cache
   */
  async getFestivalStats(tenantId: number, festivalId: number) {
    const key = buildCacheKey(CachePrefix.STATS, tenantId, 'festival', festivalId);
    return getCached(key);
  },

  /**
   * Set festival stats in cache
   */
  async setFestivalStats(tenantId: number, festivalId: number, data: any) {
    const key = buildCacheKey(CachePrefix.STATS, tenantId, 'festival', festivalId);
    return setCached(key, data, CacheTTL.FIFTEEN_MINUTES);
  },

  /**
   * Get tenant stats from cache
   */
  async getTenantStats(tenantId: number) {
    const key = buildCacheKey(CachePrefix.STATS, tenantId, 'overview');
    return getCached(key);
  },

  /**
   * Set tenant stats in cache
   */
  async setTenantStats(tenantId: number, data: any) {
    const key = buildCacheKey(CachePrefix.STATS, tenantId, 'overview');
    return setCached(key, data, CacheTTL.FIVE_MINUTES);
  },

  /**
   * Invalidate all stats for a tenant
   */
  async invalidate(tenantId: number) {
    await deleteCachedPattern(`${CachePrefix.STATS}${tenantId}:*`);
    logger.debug('Stats cache invalidated', { tenantId });
  },

  /**
   * Get stats with cache-aside pattern
   */
  async getOrCompute(
    tenantId: number,
    key: string,
    computeFn: () => Promise<any>,
    ttl: number = CacheTTL.FIFTEEN_MINUTES
  ) {
    const cacheKey = buildCacheKey(CachePrefix.STATS, tenantId, key);
    return getOrCompute(cacheKey, computeFn, ttl);
  },
};

/**
 * General cache utilities
 */
export const CacheService = {
  Festival: FestivalCache,
  Film: FilmCache,
  Tenant: TenantCache,
  Stats: StatsCache,

  /**
   * Get cache statistics
   */
  async getStats() {
    return getCacheStats();
  },

  /**
   * Clear all caches (use with caution)
   */
  async clearAll() {
    await deleteCachedPattern('*');
    logger.warn('All caches cleared');
  },

  /**
   * Clear all caches for a specific tenant
   */
  async clearTenant(tenantId: number) {
    await FestivalCache.invalidateAll(tenantId);
    await FilmCache.invalidateAll(tenantId);
    await TenantCache.invalidate(tenantId);
    await StatsCache.invalidate(tenantId);
    logger.info('All caches cleared for tenant', { tenantId });
  },

  /**
   * Warm up cache for a tenant (pre-load commonly accessed data)
   */
  async warmUp(tenantId: number, prisma: any) {
    try {
      // Warm up festivals list
      const festivals = await prisma.festival.findMany({
        where: { tenantId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { films: true, awards: true } } },
      });

      await setCached(
        buildCacheKey(CachePrefix.FESTIVALS_LIST, tenantId, 'p1', 'l20', 's', 'stall'),
        { festivals, pagination: { page: 1, limit: 20, total: festivals.length } },
        CacheTTL.FIVE_MINUTES
      );

      logger.info('Cache warmed up for tenant', { tenantId, festivalsCount: festivals.length });
    } catch (error) {
      logger.warn('Failed to warm up cache', { tenantId, error });
    }
  },
};

export default CacheService;
