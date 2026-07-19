import express from 'express';
import { authenticate } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { body, param, query, validationResult } from 'express-validator';
import PaymentService from '../services/PaymentService.js';
import { logger } from '../utils/logger';

const router = express.Router();

// Stripe webhook endpoint (no auth required)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        res.status(400).json({ error: 'Missing stripe signature' });
        return;
      }

      await PaymentService.handleStripeWebhook(req.body, signature as string);

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(400).json({
        error: 'Webhook failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Apply middleware for other routes
router.use(authenticate);
router.use(tenantMiddleware);

// POST /api/payments/create-intent - Create payment intent
router.post(
  '/create-intent',
  [
    body('festivalId').isInt().withMessage('Festival ID must be an integer'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be 3 characters'),
    body('customerEmail').optional().isEmail().withMessage('Invalid email format'),
    body('customerName').optional().isLength({ max: 255 }),
    body('description').optional().isLength({ max: 500 }),
    body('filmId').optional().isInt().withMessage('Film ID must be an integer'),
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

      const paymentData = {
        festivalId: req.body.festivalId,
        amount: parseFloat(req.body.amount),
        currency: req.body.currency,
        customerEmail: req.body.customerEmail,
        customerName: req.body.customerName,
        description: req.body.description,
        filmId: req.body.filmId,
      };

      const result = await PaymentService.createPaymentIntent(tenantId, paymentData);

      res.status(201).json({
        success: true,
        data: {
          payment: result.payment,
          clientSecret: result.clientSecret,
        },
        message: 'Payment intent created successfully',
      });
    } catch (error) {
      logger.error('Payment intent creation error:', error);
      res.status(400).json({
        error: 'Payment intent creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/payments/festival/:festivalId - Get payments by festival
router.get(
  '/festival/:festivalId',
  [
    param('festivalId').isInt().withMessage('Festival ID must be an integer'),
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
      const festivalId = parseInt(req.params.festivalId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await PaymentService.getPaymentsByFestival(tenantId, festivalId, page, limit);

      res.json({
        success: true,
        data: result.payments,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      logger.error('Error fetching payments:', error);
      res.status(500).json({
        error: 'Failed to fetch payments',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/payments/:paymentId - Get specific payment
router.get(
  '/:paymentId',
  [param('paymentId').isInt().withMessage('Payment ID must be an integer')],
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
      const paymentId = parseInt(req.params.paymentId);

      const payment = await PaymentService.getPaymentById(tenantId, paymentId);

      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error('Error fetching payment:', error);
      res.status(500).json({
        error: 'Failed to fetch payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// POST /api/payments/:paymentId/refund - Refund a payment
router.post(
  '/:paymentId/refund',
  [
    param('paymentId').isInt().withMessage('Payment ID must be an integer'),
    body('reason').optional().isLength({ max: 500 }),
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
      const paymentId = parseInt(req.params.paymentId);
      const reason = req.body.reason;

      const payment = await PaymentService.refundPayment(tenantId, paymentId, reason);

      res.json({
        success: true,
        data: payment,
        message: 'Payment refunded successfully',
      });
    } catch (error) {
      logger.error('Error refunding payment:', error);
      res.status(400).json({
        error: 'Refund failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// GET /api/payments/festival/:festivalId/stats - Get payment statistics
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

      const stats = await PaymentService.getPaymentStatistics(tenantId, festivalId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching payment statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
