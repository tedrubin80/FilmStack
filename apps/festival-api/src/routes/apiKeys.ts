import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/ApiError';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { Response } from 'express';
import { parseIntParam } from '../types/express';

export const apiKeysRouter = express.Router();

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  return `ffk_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * GET /api/api-keys
 * List all API keys for the current tenant
 */
apiKeysRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
        _count: {
          select: { apiKeyLogs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: { apiKeys }
    });
  })
);

/**
 * GET /api/api-keys/:id
 * Get a specific API key details
 */
apiKeysRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const keyId = parseIntParam(req.params.id, 'id');

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId: req.user.tenantId
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true,
        _count: {
          select: { apiKeyLogs: true }
        }
      }
    });

    if (!apiKey) {
      throw new NotFoundError('API Key', keyId);
    }

    res.json({
      success: true,
      data: { apiKey }
    });
  })
);

/**
 * POST /api/api-keys
 * Create a new API key
 */
apiKeysRouter.post(
  '/',
  authenticate,
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .isIn(['read', 'write', 'delete', 'admin'])
      .withMessage('Invalid permission type'),
    body('rateLimit')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Rate limit must be between 1 and 10000'),
    body('expiresIn')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiry days must be between 1 and 365')
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid request data', errors.array());
    }

    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { name, permissions = ['read'], rateLimit = 100, expiresIn } = req.body;

    // Check tenant's API key limit
    const existingKeysCount = await prisma.apiKey.count({
      where: { tenantId: req.user.tenantId, isActive: true }
    });

    if (existingKeysCount >= 10) {
      res.status(400).json({
        success: false,
        error: 'API key limit reached. Maximum 10 active keys per tenant.'
      });
      return;
    }

    // Generate and hash the API key
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    // Calculate expiry date if provided
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: req.user.tenantId,
        keyHash,
        name,
        permissions: JSON.stringify(permissions),
        rateLimit,
        expiresAt
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      }
    });

    logger.info(`API key created for tenant ${req.user.tenantId}`, {
      keyId: apiKey.id,
      name
    });

    // Return the plain key only once - it won't be retrievable again
    res.status(201).json({
      success: true,
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
      data: {
        apiKey: {
          ...apiKey,
          key: plainKey // Only shown once at creation
        }
      }
    });
  })
);

/**
 * PUT /api/api-keys/:id
 * Update an API key
 */
apiKeysRouter.put(
  '/:id',
  authenticate,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('rateLimit')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Rate limit must be between 1 and 10000'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid request data', errors.array());
    }

    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const keyId = parseIntParam(req.params.id, 'id');

    // Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId: req.user.tenantId
      }
    });

    if (!existingKey) {
      throw new NotFoundError('API Key', keyId);
    }

    const { name, permissions, rateLimit, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        isActive: true
      }
    });

    logger.info(`API key updated for tenant ${req.user.tenantId}`, {
      keyId: apiKey.id
    });

    res.json({
      success: true,
      message: 'API key updated successfully',
      data: { apiKey }
    });
  })
);

/**
 * DELETE /api/api-keys/:id
 * Revoke/delete an API key
 */
apiKeysRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const keyId = parseIntParam(req.params.id, 'id');

    // Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId: req.user.tenantId
      }
    });

    if (!existingKey) {
      throw new NotFoundError('API Key', keyId);
    }

    await prisma.apiKey.delete({
      where: { id: keyId }
    });

    logger.info(`API key deleted for tenant ${req.user.tenantId}`, {
      keyId
    });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  })
);

/**
 * GET /api/api-keys/:id/logs
 * Get usage logs for an API key
 */
apiKeysRouter.get(
  '/:id/logs',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const keyId = parseIntParam(req.params.id, 'id');
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    // Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId: req.user.tenantId
      }
    });

    if (!existingKey) {
      throw new NotFoundError('API Key', keyId);
    }

    const [logs, total] = await Promise.all([
      prisma.apiKeyLog.findMany({
        where: { apiKeyId: keyId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.apiKeyLog.count({ where: { apiKeyId: keyId } })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  })
);

/**
 * POST /api/api-keys/:id/regenerate
 * Regenerate an API key (creates new key, invalidates old)
 */
apiKeysRouter.post(
  '/:id/regenerate',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const keyId = parseIntParam(req.params.id, 'id');

    // Verify ownership
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        tenantId: req.user.tenantId
      }
    });

    if (!existingKey) {
      throw new NotFoundError('API Key', keyId);
    }

    // Generate new key
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: { keyHash },
      select: {
        id: true,
        name: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      }
    });

    logger.info(`API key regenerated for tenant ${req.user.tenantId}`, {
      keyId
    });

    res.json({
      success: true,
      message: 'API key regenerated successfully. Save this key securely - it will not be shown again.',
      data: {
        apiKey: {
          ...apiKey,
          key: plainKey
        }
      }
    });
  })
);
