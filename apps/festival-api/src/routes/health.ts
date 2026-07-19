import { Router, Request, Response } from 'express';
import { prisma } from '@filmstack/shared-db';
import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';
import { metricsHandler } from '../middleware/monitoring';
import { fileStorage } from '../services/FileStorageService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Basic health check endpoint
 * Returns 200 if the service is running
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check endpoint
 * Checks all critical services (database, Redis, etc.)
 */
router.get('/detailed', authenticate, async (_req: Request, res: Response): Promise<void> => {
  const healthStatus: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  let overallHealthy = true;

  // Check Database
  try {
    const startDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startDb;

    healthStatus.services.database = {
      status: 'healthy',
      latency: `${dbLatency}ms`,
      type: 'PostgreSQL',
    };
  } catch (error) {
    overallHealthy = false;
    healthStatus.services.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Database health check failed:', error);
  }

  // Check Redis (if configured)
  try {
    const redisClient = getRedis();
    if (redisClient && redisClient.status === 'ready') {
      const startRedis = Date.now();
      await redisClient.ping();
      const redisLatency = Date.now() - startRedis;

      healthStatus.services.redis = {
        status: 'healthy',
        latency: `${redisLatency}ms`,
      };
    } else {
      healthStatus.services.redis = {
        status: 'not_configured',
      };
    }
  } catch (error) {
    // Redis is optional, so don't fail overall health
    healthStatus.services.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.warn('Redis health check failed:', error);
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthStatus.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
  };

  // CPU usage
  const cpuUsage = process.cpuUsage();
  healthStatus.cpu = {
    user: `${Math.round(cpuUsage.user / 1000)}ms`,
    system: `${Math.round(cpuUsage.system / 1000)}ms`,
  };

  // File storage
  const storageInfo = fileStorage.getStorageInfo();
  healthStatus.services.storage = {
    provider: storageInfo.provider,
    ...(storageInfo.path && { path: storageInfo.path }),
  };

  // Overall status
  healthStatus.status = overallHealthy ? 'healthy' : 'unhealthy';

  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

/**
 * Readiness probe
 * Returns 200 when the application is ready to serve traffic
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      error: 'Database not accessible',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness probe
 * Returns 200 if the application process is alive
 * (Even if some services are degraded)
 */
router.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus format
 */
router.get('/metrics', authenticate, metricsHandler);

/**
 * Version endpoint
 * Returns application version and build information
 */
router.get('/version', (_req: Request, res: Response): void => {
  res.status(200).json({
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
