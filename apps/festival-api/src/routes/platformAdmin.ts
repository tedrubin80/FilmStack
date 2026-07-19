import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../middleware/auth';

export const platformAdminRouter = express.Router();

// Middleware to check if user is platform admin
const requirePlatformAdmin = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Check if user's tenant has platform admin settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Tenant not found',
      });
      return;
    }

    const settings = JSON.parse(tenant.settings || '{}');
    if (settings.platform_admin !== true || settings.access_level !== 'superuser') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Platform admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Platform admin middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin access',
    });
  }
};

// Apply authentication and platform admin check to all routes
platformAdminRouter.use(authenticate);
platformAdminRouter.use(requirePlatformAdmin);

/**
 * GET /api/platform-admin/tenants
 * Get all tenants with pagination and filtering
 */
platformAdminRouter.get(
  '/tenants',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('planType').optional().isString(),
    query('isActive').optional().isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors.array(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const planType = req.query.planType as string;
      const isActive = req.query.isActive as string;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { subdomain: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (planType) {
        where.planType = planType;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const [tenants, totalCount] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                adminUsers: true,
                festivals: true,
                films: true,
              },
            },
          },
        }),
        prisma.tenant.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          tenants,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Get tenants error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve tenants',
      });
    }
  }
);

/**
 * GET /api/platform-admin/tenants/:id
 * Get detailed information about a specific tenant
 */
platformAdminRouter.get('/tenants/:id', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const tenantId = parseInt(req.params.id || '0');

    if (isNaN(tenantId)) {
      res.status(400).json({
        error: 'Invalid ID',
        message: 'Tenant ID must be a valid number',
      });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        adminUsers: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
        },
        festivals: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isActive: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        films: {
          select: {
            id: true,
            title: true,
            director: true,
            status: true,
            submissionDate: true,
          },
          take: 10,
          orderBy: { submissionDate: 'desc' },
        },
        _count: {
          select: {
            adminUsers: true,
            festivals: true,
            films: true,
            payments: true,
          },
        },
      },
    });

    if (!tenant) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Tenant not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error) {
    logger.error('Get tenant details error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant details',
    });
  }
});

/**
 * PUT /api/platform-admin/tenants/:id
 * Update tenant information
 */
platformAdminRouter.put(
  '/tenants/:id',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('planType').optional().isIn(['starter', 'professional', 'enterprise']),
    body('isActive').optional().isBoolean(),
    body('storageLimit').optional().isInt({ min: 0 }),
    body('apiEnabled').optional().isBoolean(),
    body('apiRateLimit').optional().isInt({ min: 1 }),
    body('customDomain').optional().trim(),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
      }

      const tenantId = parseInt(req.params.id || '0');

      if (isNaN(tenantId)) {
        res.status(400).json({
          error: 'Invalid ID',
          message: 'Tenant ID must be a valid number',
        });
        return;
      }

      // Prevent updating the platform admin tenant
      if (tenantId === req.user?.tenantId) {
        res.status(400).json({
          error: 'Invalid Operation',
          message: 'Cannot modify platform admin tenant',
        });
        return;
      }

      const updateData: any = {};
      const allowedFields = [
        'name',
        'email',
        'planType',
        'isActive',
        'storageLimit',
        'apiEnabled',
        'apiRateLimit',
        'customDomain',
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      logger.info(`Tenant ${tenantId} updated by platform admin ${req.user?.username}`);

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: { tenant: updatedTenant },
      });
    } catch (error) {
      logger.error('Update tenant error:', error);

      if ((error as any).code === 'P2025') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update tenant',
      });
    }
  }
);

/**
 * DELETE /api/platform-admin/tenants/:id
 * Deactivate a tenant (soft delete)
 */
platformAdminRouter.delete(
  '/tenants/:id',
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const tenantId = parseInt(req.params.id || '0');

      if (isNaN(tenantId)) {
        res.status(400).json({
          error: 'Invalid ID',
          message: 'Tenant ID must be a valid number',
        });
        return;
      }

      // Prevent deleting the platform admin tenant
      if (tenantId === req.user?.tenantId) {
        res.status(400).json({
          error: 'Invalid Operation',
          message: 'Cannot delete platform admin tenant',
        });
        return;
      }

      const deactivatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: false },
      });

      logger.info(`Tenant ${tenantId} deactivated by platform admin ${req.user?.username}`);

      res.json({
        success: true,
        message: 'Tenant deactivated successfully',
        data: { tenant: deactivatedTenant },
      });
    } catch (error) {
      logger.error('Deactivate tenant error:', error);

      if ((error as any).code === 'P2025') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
        return;
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to deactivate tenant',
      });
    }
  }
);

/**
 * GET /api/platform-admin/stats
 * Get platform-wide statistics
 */
platformAdminRouter.get('/stats', async (_req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const [totalTenants, activeTenants, totalFestivals, totalFilms, totalPayments, recentTenants] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { isActive: true } }),
        prisma.festival.count(),
        prisma.film.count(),
        prisma.payment.count(),
        prisma.tenant.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            subdomain: true,
            createdAt: true,
            planType: true,
          },
        }),
      ]);

    const planTypeCounts = await prisma.tenant.groupBy({
      by: ['planType'],
      _count: { planType: true },
    });

    const monthlySignups = await prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM tenants
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    res.json({
      success: true,
      data: {
        overview: {
          totalTenants,
          activeTenants,
          inactiveTenants: totalTenants - activeTenants,
          totalFestivals,
          totalFilms,
          totalPayments,
        },
        planDistribution: planTypeCounts.reduce((acc: any, item: any) => {
          acc[item.planType] = item._count.planType;
          return acc;
        }, {}),
        monthlySignups: monthlySignups.map((item: any) => ({
          month: item.month,
          count: parseInt(item.count),
        })),
        recentTenants,
      },
    });
  } catch (error) {
    logger.error('Get platform stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve platform statistics',
    });
  }
});

/**
 * GET /api/platform-admin/logs
 * Get system logs with filtering
 */
platformAdminRouter.get(
  '/logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('severity').optional().isString(),
    query('eventType').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors.array(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const severity = req.query.severity as string;
      const eventType = req.query.eventType as string;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (severity) {
        where.severity = severity;
      }

      if (eventType) {
        where.eventType = eventType;
      }

      const [logs, totalCount] = await Promise.all([
        prisma.securityLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
        }),
        prisma.securityLog.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      logger.error('Get platform logs error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve logs',
      });
    }
  }
);
