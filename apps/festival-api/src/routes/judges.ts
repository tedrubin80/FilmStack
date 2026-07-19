import express from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { body, param, validationResult } from 'express-validator';
import JudgeService from '../services/JudgeService.js';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply middleware
router.use(authenticate);
router.use(tenantMiddleware);

// POST /api/judges - Create a new judge
router.post(
  '/',
  [
    body('festivalId').isInt().withMessage('Festival ID must be an integer'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('bio').optional().isLength({ max: 1000 }),
    body('expertise').optional().isLength({ max: 500 }),
  ],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const judgeData = {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        bio: req.body.bio,
        expertise: req.body.expertise,
      };

      const judge = await JudgeService.createJudge(tenantId, req.body.festivalId, judgeData);

      res.status(201).json({
        success: true,
        data: judge,
        message: 'Judge created successfully',
      });
    } catch (error) {
      logger.error('Judge creation error:', error);
      res.status(400).json({
        error: 'Judge creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/judges/festival/:festivalId - Get judges by festival
router.get(
  '/festival/:festivalId',
  [param('festivalId').isInt().withMessage('Festival ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const festivalId = parseInt(req.params.festivalId);

      const judges = await JudgeService.getJudgesByFestival(tenantId, festivalId);

      res.json({
        success: true,
        data: judges,
      });
    } catch (error) {
      logger.error('Error fetching judges:', error);
      res.status(500).json({
        error: 'Failed to fetch judges',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// POST /api/judges/:judgeId/scores - Submit score for a film
router.post(
  '/:judgeId/scores',
  [
    param('judgeId').isInt().withMessage('Judge ID must be an integer'),
    body('filmId').isInt().withMessage('Film ID must be an integer'),
    body('criteria').notEmpty().withMessage('Criteria is required'),
    body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
    body('maxScore').optional().isFloat({ min: 1 }).withMessage('Max score must be at least 1'),
    body('feedback').optional().isLength({ max: 1000 }),
  ],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const judgeId = parseInt(req.params.judgeId);

      const scoreData = {
        criteria: req.body.criteria,
        score: parseFloat(req.body.score),
        maxScore: req.body.maxScore ? parseFloat(req.body.maxScore) : undefined,
        feedback: req.body.feedback,
      };

      const score = await JudgeService.submitScore(tenantId, judgeId, req.body.filmId, scoreData);

      res.status(201).json({
        success: true,
        data: score,
        message: 'Score submitted successfully',
      });
    } catch (error) {
      logger.error('Score submission error:', error);
      res.status(400).json({
        error: 'Score submission failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/judges/:judgeId/scores - Get scores by judge
router.get(
  '/:judgeId/scores',
  [param('judgeId').isInt().withMessage('Judge ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const judgeId = parseInt(req.params.judgeId);

      const scores = await JudgeService.getJudgeScores(tenantId, judgeId);

      res.json({
        success: true,
        data: scores,
      });
    } catch (error) {
      logger.error('Error fetching judge scores:', error);
      res.status(500).json({
        error: 'Failed to fetch scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/judges/films/:filmId/scores - Get all scores for a film
router.get(
  '/films/:filmId/scores',
  [param('filmId').isInt().withMessage('Film ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const filmId = parseInt(req.params.filmId);

      const scores = await JudgeService.getFilmScores(tenantId, filmId);

      res.json({
        success: true,
        data: scores,
      });
    } catch (error) {
      logger.error('Error fetching film scores:', error);
      res.status(500).json({
        error: 'Failed to fetch film scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/judges/festival/:festivalId/averages - Get average scores for festival
router.get(
  '/festival/:festivalId/averages',
  [param('festivalId').isInt().withMessage('Festival ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const festivalId = parseInt(req.params.festivalId);

      const averages = await JudgeService.getFilmAverageScores(tenantId, festivalId);

      res.json({
        success: true,
        data: averages,
      });
    } catch (error) {
      logger.error('Error calculating averages:', error);
      res.status(500).json({
        error: 'Failed to calculate averages',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/judges/festival/:festivalId/stats - Get judging statistics
router.get(
  '/festival/:festivalId/stats',
  [param('festivalId').isInt().withMessage('Festival ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const festivalId = parseInt(req.params.festivalId);

      const stats = await JudgeService.getJudgingStatistics(tenantId, festivalId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching judging statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// PUT /api/judges/:judgeId - Update judge
router.put(
  '/:judgeId',
  [
    param('judgeId').isInt().withMessage('Judge ID must be an integer'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('bio').optional().isLength({ max: 1000 }),
    body('expertise').optional().isLength({ max: 500 }),
  ],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const judgeId = parseInt(req.params.judgeId);

      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        bio: req.body.bio,
        expertise: req.body.expertise,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) =>
          updateData[key as keyof typeof updateData] === undefined &&
          delete updateData[key as keyof typeof updateData]
      );

      const judge = await JudgeService.updateJudge(tenantId, judgeId, updateData);

      res.json({
        success: true,
        data: judge,
        message: 'Judge updated successfully',
      });
    } catch (error) {
      logger.error('Error updating judge:', error);
      res.status(500).json({
        error: 'Failed to update judge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// DELETE /api/judges/:judgeId - Deactivate judge
router.delete(
  '/:judgeId',
  [param('judgeId').isInt().withMessage('Judge ID must be an integer')],
  async (req: any, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const tenantId = req.tenant!.id;
      const judgeId = parseInt(req.params.judgeId);

      const judge = await JudgeService.deactivateJudge(tenantId, judgeId);

      res.json({
        success: true,
        data: judge,
        message: 'Judge deactivated successfully',
      });
    } catch (error) {
      logger.error('Error deactivating judge:', error);
      res.status(500).json({
        error: 'Failed to deactivate judge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
