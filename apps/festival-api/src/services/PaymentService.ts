import { Payment } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import { getRedis, isRedisAvailable } from '../config/redis';

// In-memory fallback for processed events (used when Redis unavailable)
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 10000; // Limit memory usage

interface PaymentData {
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  filmId?: number;
}

interface CreatePaymentIntentData extends PaymentData {
  festivalId: number;
}

export class PaymentService {
  private prisma = prisma;
  private _stripe: Stripe | null = null;

  private get stripe(): Stripe {
    if (!this._stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }
      this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
    }
    return this._stripe;
  }

  async createPaymentIntent(
    tenantId: number,
    paymentData: CreatePaymentIntentData
  ): Promise<{ payment: Payment; clientSecret: string }> {
    try {
      // Validate festival exists
      const festival = await this.prisma.festival.findFirst({
        where: {
          id: paymentData.festivalId,
          tenantId,
          isActive: true,
        },
      });

      if (!festival) {
        throw new Error('Festival not found or inactive');
      }

      // Validate film if specified
      if (paymentData.filmId) {
        const film = await this.prisma.film.findFirst({
          where: {
            id: paymentData.filmId,
            tenantId,
            festivalId: paymentData.festivalId,
          },
        });

        if (!film) {
          throw new Error('Film not found or not in the specified festival');
        }
      }

      // Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency || 'usd',
        metadata: {
          tenantId: tenantId.toString(),
          festivalId: paymentData.festivalId.toString(),
          filmId: paymentData.filmId?.toString() || '',
        },
        receipt_email: paymentData.customerEmail,
        description: paymentData.description,
      });

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          festivalId: paymentData.festivalId,
          filmId: paymentData.filmId,
          stripePaymentId: paymentIntent.id,
          amount: paymentData.amount,
          currency: paymentData.currency || 'USD',
          customerEmail: paymentData.customerEmail,
          customerName: paymentData.customerName,
          description: paymentData.description,
          status: 'pending',
          metadata: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        },
      });

      logger.info(`Payment intent created: ${paymentIntent.id} for ${paymentData.amount}`);

      return {
        payment,
        clientSecret: paymentIntent.client_secret!,
      };
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Check if a webhook event has already been processed (idempotency check)
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    // Try Redis first for distributed environments
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const exists = await redis.get(`stripe:event:${eventId}`);
        return exists !== null;
      }
    }

    // Fallback to in-memory set
    return processedEvents.has(eventId);
  }

  /**
   * Mark a webhook event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    // Store in Redis with 24-hour expiry (Stripe retries for up to 24 hours)
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        await redis.setex(`stripe:event:${eventId}`, 86400, '1');
        return;
      }
    }

    // Fallback to in-memory set with size limit
    if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
      // Clear oldest entries (simple approach - clear half)
      const entries = Array.from(processedEvents);
      entries.slice(0, MAX_PROCESSED_EVENTS / 2).forEach((id) => processedEvents.delete(id));
    }
    processedEvents.add(eventId);
  }

  async handleStripeWebhook(body: string, signature: string): Promise<void> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      const event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);

      // Idempotency check - prevent duplicate processing
      if (await this.isEventProcessed(event.id)) {
        logger.info(`Webhook event already processed, skipping: ${event.id}`);
        return;
      }

      // Process the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark as processed after successful handling
      await this.markEventProcessed(event.id);
      logger.info(`Webhook event processed: ${event.id} (${event.type})`);
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Update payment status
      const payment = await this.prisma.payment.updateMany({
        where: {
          stripePaymentId: paymentIntent.id,
        },
        data: {
          status: 'completed',
          paymentMethod: paymentIntent.payment_method_types[0] || 'card',
        },
      });

      if (payment.count === 0) {
        logger.warn(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
        return;
      }

      // If this is for a film submission, mark the entry fee as paid
      const paymentRecord = await this.prisma.payment.findFirst({
        where: { stripePaymentId: paymentIntent.id },
        include: { film: true },
      });

      if (paymentRecord?.filmId) {
        await this.prisma.film.update({
          where: { id: paymentRecord.filmId },
          data: {
            entryFeePaid: true,
            paymentDate: new Date(),
            paymentMethod: paymentIntent.payment_method_types[0] || 'card',
            paymentReference: paymentIntent.id,
          },
        });
      }

      logger.info(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
      logger.error('Error handling payment success:', error);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await this.prisma.payment.updateMany({
        where: {
          stripePaymentId: paymentIntent.id,
        },
        data: {
          status: 'failed',
        },
      });

      logger.info(`Payment failed: ${paymentIntent.id}`);
    } catch (error) {
      logger.error('Error handling payment failure:', error);
    }
  }

  async getPaymentsByFestival(
    tenantId: number,
    festivalId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ payments: Payment[]; total: number; hasMore: boolean }> {
    try {
      const where = { tenantId, festivalId };

      const [payments, total] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          include: {
            film: true,
            festival: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.payment.count({ where }),
      ]);

      const hasMore = page * limit < total;

      return { payments, total, hasMore };
    } catch (error) {
      logger.error('Error fetching payments by festival:', error);
      throw error;
    }
  }

  async getPaymentById(tenantId: number, paymentId: number): Promise<Payment | null> {
    try {
      return await this.prisma.payment.findFirst({
        where: {
          id: paymentId,
          tenantId,
        },
        include: {
          film: true,
          festival: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching payment by ID:', error);
      throw error;
    }
  }

  async refundPayment(tenantId: number, paymentId: number, reason?: string): Promise<Payment> {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: {
          id: paymentId,
          tenantId,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      if (!payment.stripePaymentId) {
        throw new Error('Payment has no associated Stripe payment ID');
      }

      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        reason: 'requested_by_customer',
      });

      // Update payment status
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'refunded',
          metadata: JSON.stringify({
            ...JSON.parse(payment.metadata),
            refundId: refund.id,
            refundReason: reason,
          }),
        },
      });

      // If this was for a film submission, mark entry fee as unpaid
      if (payment.filmId) {
        await this.prisma.film.update({
          where: { id: payment.filmId },
          data: {
            entryFeePaid: false,
            paymentDate: null,
            paymentMethod: null,
            paymentReference: null,
          },
        });
      }

      logger.info(`Payment refunded: ${paymentId} - ${refund.id}`);
      return updatedPayment;
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw error;
    }
  }

  async getPaymentStatistics(tenantId: number, festivalId: number) {
    try {
      const [
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        refundedPayments,
        totalRevenue,
        completedRevenue,
      ] = await Promise.all([
        this.prisma.payment.count({
          where: { tenantId, festivalId },
        }),
        this.prisma.payment.count({
          where: { tenantId, festivalId, status: 'completed' },
        }),
        this.prisma.payment.count({
          where: { tenantId, festivalId, status: 'pending' },
        }),
        this.prisma.payment.count({
          where: { tenantId, festivalId, status: 'failed' },
        }),
        this.prisma.payment.count({
          where: { tenantId, festivalId, status: 'refunded' },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, festivalId },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, festivalId, status: 'completed' },
          _sum: { amount: true },
        }),
      ]);

      const successRate = totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

      return {
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        refundedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        completedRevenue: completedRevenue._sum.amount || 0,
        successRate,
      };
    } catch (error) {
      logger.error('Error getting payment statistics:', error);
      throw error;
    }
  }
}

export default new PaymentService();
