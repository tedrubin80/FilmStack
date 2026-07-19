import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/ApiError';
import type { AuthenticatedRequest } from '../middleware/auth';
import { parseIntParam } from '../types/express';
import { CacheService } from '../services/CacheService';
import { cacheList, cacheById } from '../middleware/cacheMiddleware';

export const festivalsRouter = express.Router();

/**
 * GET /api/festivals
 * Get all festivals for the current tenant
 */
festivalsRouter.get(
  '/',
  authenticate,
  cacheList(),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('Invalid status filter'),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: any): Promise<void> => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Invalid query parameters', errors.array());
    }

    if (!req.user) {
      throw new UnauthorizedError('User authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId: req.user.tenantId };

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get festivals with counts
    const [festivals, total] = await Promise.all([
      prisma.festival.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              films: true,
              awards: true,
            },
          },
        },
      }),
      prisma.festival.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        festivals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * GET /api/festivals/public/accepting
 * Public list of festivals currently accepting submissions (cross-platform bridge)
 */
festivalsRouter.get(
  '/public/accepting',
  asyncHandler(async (_req: AuthenticatedRequest, res: any): Promise<void> => {
    const now = new Date();
    const festivals = await prisma.festival.findMany({
      where: {
        isActive: true,
        OR: [{ submissionDeadline: null }, { submissionDeadline: { gt: now } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        submissionDeadline: true,
        entryFee: true,
        earlyBirdFee: true,
        earlyBirdDeadline: true,
        currency: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: festivals });
  })
);

/**
 * GET /api/festivals/:id
 * Get a specific festival
 */
festivalsRouter.get(
  '/:id',
  authenticate,
  cacheById('festival'),
  asyncHandler(async (req: AuthenticatedRequest, res: any): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required');
    }

    const festivalId = parseIntParam(req.params.id, 'id');

    const festival = await prisma.festival.findFirst({
      where: {
        id: festivalId,
        tenantId: req.user.tenantId,
      },
      include: {
        filmCategories: true,
        _count: {
          select: {
            films: true,
            awards: true,
          },
        },
      },
    });

    if (!festival) {
      throw new NotFoundError('Festival', festivalId);
    }

    res.json({
      success: true,
      data: { festival },
    });
  })
);

/**
 * POST /api/festivals
 * Create a new festival
 */
festivalsRouter.post(
  '/',
  authenticate,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Festival name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description too long'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('location').optional().trim().isLength({ max: 255 }).withMessage('Location too long'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('contactEmail').optional().isEmail().withMessage('Invalid contact email'),
    body('contactPhone')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Phone number too long'),
    body('entryFee').optional().isDecimal().withMessage('Entry fee must be a decimal number'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters'),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        name,
        description,
        startDate,
        endDate,
        location,
        logoUrl,
        website,
        contactEmail,
        contactPhone,
        submissionDeadline,
        earlyBirdDeadline,
        notificationDate,
        entryFee,
        earlyBirdFee,
        currency,
        settings,
      } = req.body;

      // Validate date logic
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Start date must be before end date',
        });
      }

      const festival = await prisma.festival.create({
        data: {
          tenantId: req.user.tenantId,
          name,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          location,
          logoUrl,
          website,
          contactEmail,
          contactPhone,
          submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
          earlyBirdDeadline: earlyBirdDeadline ? new Date(earlyBirdDeadline) : null,
          notificationDate: notificationDate ? new Date(notificationDate) : null,
          entryFee: entryFee ? parseFloat(entryFee) : null,
          earlyBirdFee: earlyBirdFee ? parseFloat(earlyBirdFee) : null,
          currency: currency || 'USD',
          settings: settings || {},
        },
      });

      logger.info('Festival created', { tenantId: req.user.tenantId, name: festival.name, userId: req.user.userId });

      // Invalidate list cache after creation
      await CacheService.Festival.invalidateAll(req.user.tenantId);

      res.status(201).json({
        success: true,
        message: 'Festival created successfully',
        data: { festival },
      });
    } catch (error) {
      logger.error('Create festival error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create festival',
      });
    }
  }
);

/**
 * PUT /api/festivals/:id
 * Update a festival
 */
festivalsRouter.put(
  '/:id',
  authenticate,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Festival name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description too long'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('location').optional().trim().isLength({ max: 255 }).withMessage('Location too long'),
    body('website').optional().isURL().withMessage('Invalid website URL'),
    body('contactEmail').optional().isEmail().withMessage('Invalid contact email'),
    body('entryFee').optional().isDecimal().withMessage('Entry fee must be a decimal number'),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const festivalId = parseIntParam(req.params.id, 'id');

      // Check if festival exists and belongs to tenant
      const existingFestival = await prisma.festival.findFirst({
        where: {
          id: festivalId,
          tenantId: req.user.tenantId,
        },
      });

      if (!existingFestival) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Festival not found',
        });
        return;
      }

      const updateData: any = {};
      const allowedFields = [
        'name',
        'description',
        'startDate',
        'endDate',
        'location',
        'logoUrl',
        'website',
        'contactEmail',
        'contactPhone',
        'submissionDeadline',
        'earlyBirdDeadline',
        'notificationDate',
        'entryFee',
        'earlyBirdFee',
        'currency',
        'isActive',
        'settings',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (
            [
              'startDate',
              'endDate',
              'submissionDeadline',
              'earlyBirdDeadline',
              'notificationDate',
            ].includes(field)
          ) {
            updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
          } else if (['entryFee', 'earlyBirdFee'].includes(field)) {
            updateData[field] = req.body[field] ? parseFloat(req.body[field]) : null;
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      const festival = await prisma.festival.update({
        where: { id: festivalId },
        data: updateData,
      });

      // Invalidate cache after update
      await CacheService.Festival.invalidate(req.user.tenantId, festivalId);

      res.json({
        success: true,
        message: 'Festival updated successfully',
        data: { festival },
      });
    } catch (error) {
      logger.error('Update festival error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update festival',
      });
    }
  }
);

/**
 * DELETE /api/festivals/:id
 * Delete a festival
 */
festivalsRouter.delete(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const festivalId = parseIntParam(req.params.id, 'id');

      // Check if festival exists and belongs to tenant
      const existingFestival = await prisma.festival.findFirst({
        where: {
          id: festivalId,
          tenantId: req.user.tenantId,
        },
        include: {
          _count: {
            select: { films: true },
          },
        },
      });

      if (!existingFestival) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Festival not found',
        });
        return;
      }

      // Prevent deletion if festival has films
      if (existingFestival._count.films > 0) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Cannot delete festival with existing film submissions',
        });
        return;
      }

      await prisma.festival.delete({
        where: { id: festivalId },
      });

      // Invalidate cache after deletion
      await CacheService.Festival.invalidate(req.user.tenantId, festivalId);

      res.json({
        success: true,
        message: 'Festival deleted successfully',
      });
    } catch (error) {
      logger.error('Delete festival error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete festival',
      });
    }
  }
);

/**
 * GET /api/festivals/:id/stats
 * Get statistics for a specific festival
 */
festivalsRouter.get(
  '/:id/stats',
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const festivalId = parseIntParam(req.params.id, 'id');

      // Verify festival belongs to tenant
      const festival = await prisma.festival.findFirst({
        where: {
          id: festivalId,
          tenantId: req.user.tenantId,
        },
      });

      if (!festival) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Festival not found',
        });
        return;
      }

      // Get comprehensive stats
      const stats = await prisma.$transaction(async (tx) => {
        // Film submissions by status
        const filmsByStatus = await tx.film.groupBy({
          by: ['status'],
          where: { festivalId },
          _count: { id: true },
        });

        // Submissions over time (last 30 days)
        const submissionsOverTime = await tx.$queryRaw`
        SELECT DATE(submission_date) as date, COUNT(*) as count
        FROM films
        WHERE festival_id = ${festivalId}
          AND submission_date >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(submission_date)
        ORDER BY date
      `;

        // Top genres
        const topGenres = await tx.film.groupBy({
          by: ['genre'],
          where: { festivalId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        });

        // Countries
        const countries = await tx.film.groupBy({
          by: ['country'],
          where: { festivalId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        });

        return {
          filmsByStatus,
          submissionsOverTime,
          topGenres,
          countries,
        };
      });

      res.json({
        success: true,
        data: {
          festivalId,
          statistics: stats,
        },
      });
    } catch (error) {
      logger.error('Get festival stats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get festival statistics',
      });
    }
  }
);
