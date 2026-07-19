const { cache } = require('../config/redis');
const { getClient } = require('../config/redis');

/**
 * Redis caching middleware for Express routes
 * @param {number} ttlSeconds - Cache time-to-live in seconds
 * @param {string} keyPrefix - Prefix for the cache key
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttlSeconds, keyPrefix) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `cache:${keyPrefix}:${req.originalUrl}`;

        try {
            const cached = await cache.get(cacheKey);

            if (cached) {
                res.set('X-Cache', 'HIT');
                return res.json(cached);
            }
        } catch (error) {
            console.error('Cache middleware read error:', error);
        }

        // Monkey-patch res.json to intercept the response and cache it
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            try {
                await cache.set(cacheKey, body, ttlSeconds);
            } catch (error) {
                console.error('Cache middleware write error:', error);
            }

            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
}

/**
 * Clear all cache keys matching a given prefix pattern
 * @param {string} keyPrefix - The prefix to match for deletion
 */
async function clearCache(keyPrefix) {
    try {
        const client = getClient();
        const pattern = `cache:${keyPrefix}:*`;
        let cursor = 0;
        let deletedCount = 0;

        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            const keys = result.keys;

            if (keys.length > 0) {
                await client.del(keys);
                deletedCount += keys.length;
            }
        } while (cursor !== 0);

        console.log(`Cleared ${deletedCount} cache keys matching "${pattern}"`);
        return deletedCount;
    } catch (error) {
        console.error('Clear cache error:', error);
        return 0;
    }
}

module.exports = { cacheMiddleware, clearCache };
