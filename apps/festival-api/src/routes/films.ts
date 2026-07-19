import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { uploadRateLimiter } from '../middleware/rateLimiting';
import { body, param, query, validationResult } from 'express-validator';
import FilmService from '../services/FilmService.js';
import { logger } from '../utils/logger';
import { cacheById } from '../middleware/cacheMiddleware';
import { CacheService } from '../services/CacheService';
import { generateSafeFilename, isAllowedFileType } from '../utils/sanitize';

const router = express.Router();

// Configure multer for file uploads with security enhancements
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, '/tmp/festival-uploads/temp');
  },
  filename: (_req, file, cb) => {
    // Use sanitized filename generation to prevent path traversal
    const safeFilename = generateSafeFilename(file.originalname, file.fieldname);
    cb(null, safeFilename);
  },
});

// Whitelist of allowed file extensions
const ALLOWED_FILE_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.wmv',
  '.flv',
  '.webm', // Videos
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp', // Images
  '.pdf',
  '.doc',
  '.docx',
  '.txt', // Documents
];

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default (reduced from 1GB)
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    // Validate file type using whitelist
    const isAllowed = isAllowedFileType(file.originalname, ALLOWED_FILE_EXTENSIONS);

    if (isAllowed) {
      // Additional MIME type check for extra security
      const allowedMimeTypes = [
        'video/',
        'image/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats',
        'text/plain',
      ];

      const mimeTypeAllowed = allowedMimeTypes.some((type) => file.mimetype.startsWith(type));

      if (mimeTypeAllowed) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid MIME type: ${file.mimetype}`));
      }
    } else {
      cb(new Error(`Invalid file type. Allowed extensions: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`));
    }
  },
});

// Apply middleware
router.use(authenticate);
router.use(tenantMiddleware);

// POST /api/films/submit - Submit a new film
router.post(
  '/submit',
  uploadRateLimiter, // Strict rate limiting for file uploads
  upload.array('files', 10),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('festivalId').isInt().withMessage('Festival ID must be an integer'),
    body('director').optional().isLength({ max: 255 }),
    body('contactEmail').optional().isEmail().withMessage('Invalid email format'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive'),
    body('year')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
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
      const files = req.files as Express.Multer.File[];

      const filmData = {
        title: req.body.title,
        director: req.body.director,
        producer: req.body.producer,
        writer: req.body.writer,
        duration: req.body.duration ? parseInt(req.body.duration) : undefined,
        year: req.body.year ? parseInt(req.body.year) : undefined,
        country: req.body.country,
        language: req.body.language,
        subtitles: req.body.subtitles,
        genre: req.body.genre,
        synopsis: req.body.synopsis,
        screeningFormat: req.body.screeningFormat,
        aspectRatio: req.body.aspectRatio,
        soundFormat: req.body.soundFormat,
        premiereStatus: req.body.premiereStatus,
        studentFilm: req.body.studentFilm === 'true',
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        notes: req.body.notes,
      };

      const film = await FilmService.submitFilm(
        tenantId,
        parseInt(req.body.festivalId),
        filmData,
        files
      );

      // Invalidate film list caches
      await CacheService.Film.invalidateAll(tenantId);

      res.status(201).json({
        success: true,
        data: film,
        message: 'Film submitted successfully',
      });
    } catch (error) {
      logger.error('Film submission error:', error);
      res.status(400).json({
        error: 'Film submission failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/films/festival/:festivalId - Get films by festival
router.get(
  '/festival/:festivalId',
  [
    param('festivalId').isInt().withMessage('Festival ID must be an integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['pending', 'accepted', 'rejected', 'withdrawn']),
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
      const festivalId = parseInt(req.params.festivalId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await FilmService.getFilmsByFestival(
        tenantId,
        festivalId,
        page,
        limit,
        status
      );

      res.json({
        success: true,
        data: result.films,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      logger.error('Error fetching films:', error);
      res.status(500).json({
        error: 'Failed to fetch films',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/films/:filmId - Get specific film
router.get(
  '/:filmId',
  cacheById('film'),
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

      const film = await FilmService.getFilmById(tenantId, filmId);

      if (!film) {
        return res.status(404).json({
          error: 'Film not found',
        });
      }

      res.json({
        success: true,
        data: film,
      });
    } catch (error) {
      logger.error('Error fetching film:', error);
      res.status(500).json({
        error: 'Failed to fetch film',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// PUT /api/films/:filmId/status - Update film status
router.put(
  '/:filmId/status',
  [
    param('filmId').isInt().withMessage('Film ID must be an integer'),
    body('status')
      .isIn(['pending', 'accepted', 'rejected', 'withdrawn'])
      .withMessage('Invalid status'),
    body('notes').optional().isLength({ max: 1000 }),
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
      const filmId = parseInt(req.params.filmId);
      const { status, notes } = req.body;

      const film = await FilmService.updateFilmStatus(tenantId, filmId, status, notes);

      // Invalidate film cache after status update
      await CacheService.Film.invalidate(tenantId, filmId);

      res.json({
        success: true,
        data: film,
        message: `Film status updated to ${status}`,
      });
    } catch (error) {
      logger.error('Error updating film status:', error);
      res.status(500).json({
        error: 'Failed to update film status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/films/festival/:festivalId/stats - Get film statistics for festival
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

      const stats = await FilmService.getFilmStatistics(tenantId, festivalId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching film statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/films/files/:fileId/download - Download film file
router.get(
  '/files/:fileId/download',
  [param('fileId').isInt().withMessage('File ID must be an integer')],
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
      const fileId = parseInt(req.params.fileId);

      const filePath = await FilmService.getFileDownloadUrl(tenantId, fileId);

      // Send file for download
      res.download(filePath);
    } catch (error) {
      logger.error('Error downloading file:', error);
      res.status(404).json({
        error: 'File not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// DELETE /api/films/:filmId - Delete film
router.delete(
  '/:filmId',
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

      await FilmService.deleteFilm(tenantId, filmId);

      // Invalidate film cache after deletion
      await CacheService.Film.invalidate(tenantId, filmId);

      res.json({
        success: true,
        message: 'Film deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting film:', error);
      res.status(500).json({
        error: 'Failed to delete film',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export const filmsRouter = router;
export default router;
