import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';

/**
 * Tenant middleware to ensure proper tenant isolation.
 * Must be used after authentication middleware.
 */
export const tenantMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Forbidden', message: 'No tenant context available' });
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, isActive: true },
    });

    if (!tenant) {
      logger.warn(`Tenant not found or inactive for user ${req.user.username} (tenant ID: ${tenantId})`);
      res.status(403).json({ error: 'Forbidden', message: 'Tenant account is not active or does not exist' });
      return;
    }

    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      planType: tenant.planType,
      settings: tenant.settings,
      storageUsed: BigInt(tenant.storageUsed),
      storageLimit: BigInt(tenant.storageLimit),
    };

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to verify tenant information' });
  }
};

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: number;
        name: string;
        subdomain: string;
        planType: string;
        settings: any;
        storageUsed: bigint;
        storageLimit: bigint;
      };
    }
  }
}
