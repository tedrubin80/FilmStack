import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../middleware/auth';

export const tenantsRouter = express.Router();

/**
 * GET /api/tenants/current
 * Get current tenant information
 */
tenantsRouter.get(
  '/current',
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        include: {
          _count: {
            select: {
              festivals: true,
              adminUsers: true,
              tenantAdmins: true,
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

      // Calculate usage statistics
      const usageStats = await prisma.$transaction(async (tx) => {
        // Count films across all festivals
        const filmCount = await tx.film.count({
          where: {
            tenantId: tenant.id,
          },
        });

        // Calculate storage usage
        const storageResult = await tx.filmFile.aggregate({
          where: {
            film: {
              tenantId: tenant.id,
            },
          },
          _sum: {
            fileSize: true,
          },
        });

        return {
          filmCount,
          storageUsed: storageResult._sum.fileSize || 0,
        };
      });

      res.json({
        success: true,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            email: tenant.email,
            planType: tenant.planType,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            settings: tenant.settings,
            storageUsed: usageStats.storageUsed,
            storageLimit: tenant.storageLimit,
            counts: {
              festivals: tenant._count.festivals,
              admins: tenant._count.adminUsers + tenant._count.tenantAdmins,
              films: usageStats.filmCount,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Get current tenant error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get tenant information',
      });
    }
  }
);

/**
 * PUT /api/tenants/current
 * Update current tenant information
 */
tenantsRouter.put(
  '/current',
  authenticate,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Organization name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('customDomain')
      .optional()
      .matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i)
      .withMessage('Please provide a valid domain name'),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const { name, email, customDomain, settings } = req.body;

      // Sanitize settings to prevent privilege escalation
      let safeSettings = settings;
      if (settings) {
        const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings;
        delete parsed.platform_admin;
        delete parsed.access_level;
        safeSettings = typeof settings === 'string' ? JSON.stringify(parsed) : parsed;
      }

      // Update tenant
      const updatedTenant = await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(customDomain && { customDomain }),
          ...(safeSettings && { settings: safeSettings }),
        },
      });

      logger.info(`Tenant ${updatedTenant.name} updated by user ${req.user.username}`);

      res.json({
        success: true,
        message: 'Tenant information updated successfully',
        data: {
          tenant: {
            id: updatedTenant.id,
            name: updatedTenant.name,
            subdomain: updatedTenant.subdomain,
            email: updatedTenant.email,
            planType: updatedTenant.planType,
            customDomain: updatedTenant.customDomain,
            settings: updatedTenant.settings,
          },
        },
      });
    } catch (error) {
      logger.error('Update tenant error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update tenant information',
      });
    }
  }
);

/**
 * GET /api/tenants/usage-stats
 * Get detailed usage statistics for current tenant
 */
tenantsRouter.get(
  '/usage-stats',
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const stats = await prisma.$transaction(async (tx) => {
        // Festival statistics
        const festivalStats = await tx.festival.aggregate({
          where: { tenantId: req.user!.tenantId },
          _count: { id: true },
        });

        // Film statistics by status
        const filmStats = await tx.film.groupBy({
          by: ['status'],
          where: { tenantId: req.user!.tenantId },
          _count: { id: true },
        });

        // Storage usage by file type
        const storageStats = await tx.filmFile.groupBy({
          by: ['fileType'],
          where: {
            film: { tenantId: req.user!.tenantId },
          },
          _sum: { fileSize: true },
          _count: { id: true },
        });

        // Monthly submission trends (last 12 months)
        const submissionTrends = await tx.$queryRaw`
        SELECT
          DATE_TRUNC('month', submission_date) as month,
          COUNT(*) as count
        FROM films f
        JOIN festivals fest ON f.festival_id = fest.id
        WHERE fest.tenant_id = ${req.user!.tenantId}
          AND f.submission_date >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', submission_date)
        ORDER BY month
      `;

        return {
          festivals: festivalStats._count.id,
          films: filmStats,
          storage: storageStats,
          trends: submissionTrends,
        };
      });

      res.json({
        success: true,
        data: {
          statistics: stats,
        },
      });
    } catch (error) {
      logger.error('Get usage stats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get usage statistics',
      });
    }
  }
);

/**
 * GET /api/tenants/subscription
 * Get current subscription information
 */
tenantsRouter.get(
  '/subscription',
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: {
          planType: true,
          storageUsed: true,
          storageLimit: true,
          apiEnabled: true,
          apiRateLimit: true,
          settings: true,
        },
      });

      if (!tenant) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
        return;
      }

      // Get plan limits and features
      const planLimits = getPlanLimits(tenant.planType);

      res.json({
        success: true,
        data: {
          subscription: {
            plan: tenant.planType,
            apiEnabled: tenant.apiEnabled,
            apiRateLimit: tenant.apiRateLimit,
            storage: {
              used: tenant.storageUsed,
              limit: tenant.storageLimit,
              percentage: (Number(tenant.storageUsed) / Number(tenant.storageLimit)) * 100,
            },
            limits: planLimits,
            features: getPlanFeatures(tenant.planType),
          },
        },
      });
    } catch (error) {
      logger.error('Get subscription error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get subscription information',
      });
    }
  }
);

/**
 * Helper function to get plan limits
 */
function getPlanLimits(planType: string) {
  const limits = {
    starter: {
      festivals: 2,
      submissions: 500,
      storage: '5GB',
      users: 3,
      apiCalls: 1000,
    },
    professional: {
      festivals: -1, // unlimited
      submissions: 2000,
      storage: '50GB',
      users: 10,
      apiCalls: 10000,
    },
    enterprise: {
      festivals: -1, // unlimited
      submissions: -1, // unlimited
      storage: '500GB',
      users: -1, // unlimited
      apiCalls: 100000,
    },
  };

  return limits[planType as keyof typeof limits] || limits.starter;
}

/**
 * Helper function to get plan features
 */
function getPlanFeatures(planType: string) {
  const features = {
    starter: [
      'Basic festival management',
      'Film submissions',
      'Email templates',
      'Community support',
    ],
    professional: [
      'Everything in Starter',
      'Advanced analytics',
      'AI content assistant',
      'Email automation',
      'Multi-user access',
      'Priority support',
      'API access',
    ],
    enterprise: [
      'Everything in Professional',
      'Custom branding',
      'White-label options',
      'Advanced API access',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  };

  return features[planType as keyof typeof features] || features.starter;
}
