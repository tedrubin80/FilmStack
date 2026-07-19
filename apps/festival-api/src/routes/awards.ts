import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '@filmstack/shared-db';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { logger } from '../utils/logger';
import {
  sendSuccess,
  sendValidationError,
  sendServerError,
} from '../utils/responseHelpers';

const router = Router();

// Apply authentication and tenant middleware
router.use(authenticate);
router.use(tenantMiddleware);

// ============================================
// FILM CATEGORIES ENDPOINTS
// ============================================

/**
 * GET /api/awards/categories/festival/:festivalId
 * Get all categories for a festival
 */
router.get(
  '/categories/festival/:festivalId',
  [param('festivalId').isInt().withMessage('Festival ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array());
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const festivalId = parseInt(req.params.festivalId as string);

      const categories = await prisma.filmCategory.findMany({
        where: { tenantId, festivalId },
        orderBy: { name: 'asc' },
      });

      sendSuccess(res, categories);
    } catch (error) {
      logger.error('Error fetching categories:', error);
      sendServerError(res, 'Failed to fetch categories');
    }
  }
);

/**
 * GET /api/awards/categories/:categoryId
 * Get a specific category
 */
router.get(
  '/categories/:categoryId',
  [param('categoryId').isInt().withMessage('Category ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const categoryId = parseInt(req.params.categoryId as string);

      const category = await prisma.filmCategory.findFirst({
        where: { id: categoryId, tenantId },
        include: { festival: true },
      });

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ success: true, data: category });
    } catch (error) {
      logger.error('Error fetching category:', error);
      res.status(500).json({
        error: 'Failed to fetch category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/awards/categories
 * Create a new category
 */
router.post(
  '/categories',
  [
    body('festivalId').isInt().withMessage('Festival ID is required'),
    body('name').notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().isLength({ max: 500 }),
    body('entryFee').optional().isFloat({ min: 0 }).withMessage('Entry fee must be non-negative'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const { festivalId, name, description, entryFee } = req.body;

      // Verify festival belongs to tenant
      const festival = await prisma.festival.findFirst({
        where: { id: festivalId, tenantId },
      });

      if (!festival) {
        res.status(404).json({ error: 'Festival not found' });
        return;
      }

      // Check for duplicate category name
      const existing = await prisma.filmCategory.findFirst({
        where: { festivalId, name, tenantId },
      });

      if (existing) {
        res.status(400).json({ error: 'A category with this name already exists for this festival' });
        return;
      }

      const category = await prisma.filmCategory.create({
        data: {
          tenantId,
          festivalId,
          name,
          description,
          entryFee: entryFee ? parseFloat(entryFee) : null,
        },
      });

      logger.info(`Category created: ${category.id} - ${category.name}`);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      logger.error('Error creating category:', error);
      res.status(500).json({
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /api/awards/categories/:categoryId
 * Update a category
 */
router.put(
  '/categories/:categoryId',
  [
    param('categoryId').isInt().withMessage('Category ID must be an integer'),
    body('name').optional().isLength({ max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('entryFee').optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const categoryId = parseInt(req.params.categoryId as string);
      const { name, description, entryFee } = req.body;

      // Verify category exists and belongs to tenant
      const existing = await prisma.filmCategory.findFirst({
        where: { id: categoryId, tenantId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // Check for duplicate name if changing name
      if (name && name !== existing.name) {
        const duplicate = await prisma.filmCategory.findFirst({
          where: { festivalId: existing.festivalId, name, tenantId, NOT: { id: categoryId } },
        });

        if (duplicate) {
          res.status(400).json({ error: 'A category with this name already exists' });
          return;
        }
      }

      const category = await prisma.filmCategory.update({
        where: { id: categoryId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(entryFee !== undefined && { entryFee: entryFee ? parseFloat(entryFee) : null }),
        },
      });

      logger.info(`Category updated: ${category.id}`);
      res.json({ success: true, data: category });
    } catch (error) {
      logger.error('Error updating category:', error);
      res.status(500).json({
        error: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/awards/categories/:categoryId
 * Delete a category
 */
router.delete(
  '/categories/:categoryId',
  [param('categoryId').isInt().withMessage('Category ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const categoryId = parseInt(req.params.categoryId as string);

      // Verify category exists and belongs to tenant
      const category = await prisma.filmCategory.findFirst({
        where: { id: categoryId, tenantId },
      });

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      await prisma.filmCategory.delete({ where: { id: categoryId } });

      logger.info(`Category deleted: ${categoryId}`);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      logger.error('Error deleting category:', error);
      res.status(500).json({
        error: 'Failed to delete category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================
// AWARDS ENDPOINTS
// ============================================

/**
 * GET /api/awards/festival/:festivalId
 * Get all awards for a festival
 */
router.get(
  '/festival/:festivalId',
  [param('festivalId').isInt().withMessage('Festival ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const festivalId = parseInt(req.params.festivalId as string);

      const awards = await prisma.award.findMany({
        where: { festivalId },
        include: {
          film: {
            select: { id: true, title: true, director: true },
          },
        },
        orderBy: [{ year: 'desc' }, { category: 'asc' }],
      });

      res.json({ success: true, data: awards });
    } catch (error) {
      logger.error('Error fetching awards:', error);
      res.status(500).json({
        error: 'Failed to fetch awards',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/awards/film/:filmId
 * Get all awards for a specific film
 */
router.get(
  '/film/:filmId',
  [param('filmId').isInt().withMessage('Film ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const filmId = parseInt(req.params.filmId as string);

      // Verify film belongs to tenant
      const film = await prisma.film.findFirst({
        where: { id: filmId, tenantId },
      });

      if (!film) {
        res.status(404).json({ error: 'Film not found' });
        return;
      }

      const awards = await prisma.award.findMany({
        where: { filmId },
        include: {
          festival: {
            select: { id: true, name: true },
          },
        },
        orderBy: { year: 'desc' },
      });

      res.json({ success: true, data: awards });
    } catch (error) {
      logger.error('Error fetching film awards:', error);
      res.status(500).json({
        error: 'Failed to fetch awards',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/awards/:awardId
 * Get a specific award
 */
router.get(
  '/:awardId',
  [param('awardId').isInt().withMessage('Award ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const awardId = parseInt(req.params.awardId as string);

      const award = await prisma.award.findUnique({
        where: { id: awardId },
        include: {
          festival: true,
          film: true,
        },
      });

      if (!award) {
        res.status(404).json({ error: 'Award not found' });
        return;
      }

      res.json({ success: true, data: award });
    } catch (error) {
      logger.error('Error fetching award:', error);
      res.status(500).json({
        error: 'Failed to fetch award',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/awards
 * Create a new award
 */
router.post(
  '/',
  [
    body('festivalId').isInt().withMessage('Festival ID is required'),
    body('filmId').optional().isInt(),
    body('category').optional().isLength({ max: 100 }),
    body('awardName').notEmpty().isLength({ max: 200 }).withMessage('Award name is required'),
    body('recipientName').optional().isLength({ max: 200 }),
    body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const { festivalId, filmId, category, awardName, recipientName, year } = req.body;

      // Verify festival belongs to tenant
      const festival = await prisma.festival.findFirst({
        where: { id: festivalId, tenantId },
      });

      if (!festival) {
        res.status(404).json({ error: 'Festival not found' });
        return;
      }

      // Verify film if provided
      if (filmId) {
        const film = await prisma.film.findFirst({
          where: { id: filmId, tenantId, festivalId },
        });

        if (!film) {
          res.status(404).json({ error: 'Film not found in this festival' });
          return;
        }
      }

      const award = await prisma.award.create({
        data: {
          festivalId,
          filmId: filmId || null,
          category,
          awardName,
          recipientName,
          year: year || new Date().getFullYear(),
        },
        include: {
          film: { select: { id: true, title: true } },
          festival: { select: { id: true, name: true } },
        },
      });

      logger.info(`Award created: ${award.id} - ${award.awardName}`);
      res.status(201).json({ success: true, data: award });
    } catch (error) {
      logger.error('Error creating award:', error);
      res.status(500).json({
        error: 'Failed to create award',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /api/awards/:awardId
 * Update an award
 */
router.put(
  '/:awardId',
  [
    param('awardId').isInt().withMessage('Award ID must be an integer'),
    body('filmId').optional().isInt(),
    body('category').optional().isLength({ max: 100 }),
    body('awardName').optional().isLength({ max: 200 }),
    body('recipientName').optional().isLength({ max: 200 }),
    body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const awardId = parseInt(req.params.awardId as string);
      const { filmId, category, awardName, recipientName, year } = req.body;

      // Verify award exists
      const existing = await prisma.award.findUnique({
        where: { id: awardId },
        include: { festival: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Award not found' });
        return;
      }

      // Verify tenant owns the festival
      if (existing.festival.tenantId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Verify film if provided
      if (filmId) {
        const film = await prisma.film.findFirst({
          where: { id: filmId, tenantId, festivalId: existing.festivalId },
        });

        if (!film) {
          res.status(404).json({ error: 'Film not found in this festival' });
          return;
        }
      }

      const award = await prisma.award.update({
        where: { id: awardId },
        data: {
          ...(filmId !== undefined && { filmId: filmId || null }),
          ...(category !== undefined && { category }),
          ...(awardName && { awardName }),
          ...(recipientName !== undefined && { recipientName }),
          ...(year && { year }),
        },
        include: {
          film: { select: { id: true, title: true } },
          festival: { select: { id: true, name: true } },
        },
      });

      logger.info(`Award updated: ${award.id}`);
      res.json({ success: true, data: award });
    } catch (error) {
      logger.error('Error updating award:', error);
      res.status(500).json({
        error: 'Failed to update award',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/awards/:awardId
 * Delete an award
 */
router.delete(
  '/:awardId',
  [param('awardId').isInt().withMessage('Award ID must be an integer')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const tenantId = (req as any).tenant!.id;
      const awardId = parseInt(req.params.awardId as string);

      // Verify award exists
      const award = await prisma.award.findUnique({
        where: { id: awardId },
        include: { festival: true },
      });

      if (!award) {
        res.status(404).json({ error: 'Award not found' });
        return;
      }

      // Verify tenant owns the festival
      if (award.festival.tenantId !== tenantId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await prisma.award.delete({ where: { id: awardId } });

      logger.info(`Award deleted: ${awardId}`);
      res.json({ success: true, message: 'Award deleted successfully' });
    } catch (error) {
      logger.error('Error deleting award:', error);
      res.status(500).json({
        error: 'Failed to delete award',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export { router as awardsRouter };
export default router;
