import express from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { emailRateLimiter } from '../middleware/rateLimiting';
import { body, query, validationResult } from 'express-validator';
import EmailService from '../services/EmailService.js';
import { logger } from '../utils/logger';
import { sanitizeEmailHtml, sanitizeText } from '../utils/sanitize';

const router = express.Router();

// Apply middleware
router.use(authenticate);
router.use(tenantMiddleware);

// POST /api/emails/templates - Create email template
router.post(
  '/templates',
  [
    body('name').notEmpty().withMessage('Template name is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('htmlBody').notEmpty().withMessage('HTML body is required'),
    body('textBody').optional().isLength({ max: 10000 }),
    body('variables').optional().isArray(),
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

      // Sanitize HTML content to prevent XSS attacks
      const templateData = {
        name: sanitizeText(req.body.name),
        subject: sanitizeText(req.body.subject),
        htmlBody: sanitizeEmailHtml(req.body.htmlBody),
        textBody: req.body.textBody ? sanitizeText(req.body.textBody) : undefined,
        variables: req.body.variables,
      };

      const template = await EmailService.createEmailTemplate(tenantId, templateData);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Email template created successfully',
      });
    } catch (error) {
      logger.error('Template creation error:', error);
      res.status(400).json({
        error: 'Template creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/emails/templates - Get email templates
router.get('/templates', async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    const templates = await EmailService.getEmailTemplates(tenantId);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/emails/send - Send email
router.post(
  '/send',
  emailRateLimiter, // Rate limit email sending
  [
    body('recipientEmail').isEmail().withMessage('Valid recipient email is required'),
    body('templateName').notEmpty().withMessage('Template name is required'),
    body('variables').optional().isObject(),
    body('subject').optional().isLength({ max: 255 }),
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

      const emailData = {
        recipientEmail: req.body.recipientEmail,
        templateName: req.body.templateName,
        variables: req.body.variables,
        subject: req.body.subject,
      };

      const emailLog = await EmailService.sendEmail(tenantId, emailData);

      res.status(201).json({
        success: true,
        data: emailLog,
        message: 'Email sent successfully',
      });
    } catch (error) {
      logger.error('Email sending error:', error);
      res.status(400).json({
        error: 'Email sending failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/emails/logs - Get email logs
router.get(
  '/logs',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await EmailService.getEmailLogs(tenantId, page, limit);

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      logger.error('Error fetching email logs:', error);
      res.status(500).json({
        error: 'Failed to fetch email logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/emails/stats - Get email statistics
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    const stats = await EmailService.getEmailStatistics(tenantId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching email statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/emails/setup-defaults - Create default templates
router.post('/setup-defaults', async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    await EmailService.createDefaultTemplates(tenantId);

    res.json({
      success: true,
      message: 'Default email templates created successfully',
    });
  } catch (error) {
    logger.error('Error creating default templates:', error);
    res.status(500).json({
      error: 'Failed to create default templates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
