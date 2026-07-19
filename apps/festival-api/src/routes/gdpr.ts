import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../middleware/auth';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import emailService from '../services/EmailService';

export const gdprRouter = express.Router();

/**
 * POST /api/gdpr/export-request
 * Request data export (GDPR Article 15 - Right of access)
 */
gdprRouter.post(
  '/export-request',
  [
    body('requestType')
      .isIn(['export', 'deletion'])
      .withMessage('Request type must be either export or deletion'),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
        return;
      }

      const { requestType } = req.body;
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check if there's already a pending request
      const existingRequest = await prisma.dataExportRequest.findFirst({
        where: {
          userId,
          tenantId,
          requestType,
          status: {
            in: ['pending', 'processing'],
          },
        },
      });

      if (existingRequest) {
        res.status(409).json({
          error: 'Request Already Exists',
          message: `You already have a pending ${requestType} request. Please wait for it to complete.`,
        });
        return;
      }

      // Get user info for email notification
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      // Create export request
      const exportRequest = await prisma.dataExportRequest.create({
        data: {
          userId,
          tenantId,
          requestType,
          ipAddress,
          userAgent,
          status: 'pending',
        },
      });

      // Send confirmation email that request was received
      if (user) {
        await emailService.sendGDPRRequestReceived(tenantId, {
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          requestType: requestType as 'export' | 'deletion',
        });
      }

      // Process the request asynchronously with proper error handling
      if (requestType === 'export') {
        processDataExport(exportRequest.id).catch((err) => {
          logger.error(`Background GDPR export job failed for request ${exportRequest.id}:`, err);
        });
      } else {
        processDataDeletion(exportRequest.id).catch((err) => {
          logger.error(`Background GDPR deletion job failed for request ${exportRequest.id}:`, err);
        });
      }

      logger.info(`GDPR ${requestType} request created`, {
        requestId: exportRequest.id,
        userId,
        tenantId,
        requestType,
      });

      res.status(201).json({
        success: true,
        message: `Your ${requestType} request has been submitted. You will receive an email when it's ready.`,
        data: {
          requestId: exportRequest.id,
          status: exportRequest.status,
          requestedAt: exportRequest.requestedAt,
        },
      });
    } catch (error) {
      logger.error('GDPR export request error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process export request',
      });
    }
  }
);

/**
 * GET /api/gdpr/requests/:requestId/status
 * Get status of a specific GDPR request
 */
gdprRouter.get('/requests/:requestId/status', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const requestId = parseInt(req.params.requestId || '0');
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const request = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        userId,
        tenantId,
      },
      select: {
        id: true,
        requestType: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        completedAt: true,
        expiresAt: true,
        failureReason: true,
      },
    });

    if (!request) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Request not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { request },
    });
  } catch (error) {
    logger.error('Get GDPR request status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve request status',
    });
  }
});

/**
 * POST /api/gdpr/requests/:requestId/retry
 * Retry a failed GDPR request
 */
gdprRouter.post('/requests/:requestId/retry', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const requestId = parseInt(req.params.requestId || '0');
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const request = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        userId,
        tenantId,
        status: 'failed',
      },
    });

    if (!request) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Failed request not found or cannot be retried',
      });
      return;
    }

    // Reset status to pending
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending',
        failureReason: null,
        processedAt: null,
        completedAt: null,
      },
    });

    // Retry the request
    if (request.requestType === 'export') {
      processDataExport(requestId).catch((err) => {
        logger.error(`Retry GDPR export job failed for request ${requestId}:`, err);
      });
    } else {
      processDataDeletion(requestId).catch((err) => {
        logger.error(`Retry GDPR deletion job failed for request ${requestId}:`, err);
      });
    }

    logger.info(`GDPR ${request.requestType} request retry initiated`, {
      requestId,
      userId,
      tenantId,
    });

    res.json({
      success: true,
      message: `Your ${request.requestType} request has been resubmitted for processing.`,
      data: { requestId },
    });
  } catch (error) {
    logger.error('GDPR request retry error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retry request',
    });
  }
});

/**
 * GET /api/gdpr/requests
 * Get user's GDPR requests
 */
gdprRouter.get('/requests', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const requests = await prisma.dataExportRequest.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: { requestedAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    logger.error('Get GDPR requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve requests',
    });
  }
});

/**
 * GET /api/gdpr/download/:requestId
 * Download exported data
 */
gdprRouter.get('/download/:requestId', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const requestId = parseInt(req.params.requestId || '0');
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const exportRequest = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        userId,
        tenantId,
        requestType: 'export',
        status: 'completed',
      },
    });

    if (!exportRequest) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Export request not found or not ready for download',
      });
      return;
    }

    // Check if download URL has expired
    if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
      res.status(410).json({
        error: 'Download Expired',
        message: 'This download link has expired. Please create a new export request.',
      });
      return;
    }

    if (!exportRequest.downloadUrl) {
      res.status(404).json({
        error: 'Download Not Available',
        message: 'Download file is not available',
      });
      return;
    }

    const exportsDir = path.resolve(process.cwd(), 'exports');
    const filePath = path.resolve(exportsDir, path.basename(exportRequest.downloadUrl));

    // Prevent path traversal
    if (!filePath.startsWith(exportsDir)) {
      res.status(400).json({
        error: 'Invalid Path',
        message: 'Invalid download path',
      });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: 'File Not Found',
        message: 'Export file no longer exists',
      });
      return;
    }

    res.download(filePath, `gdpr-export-${requestId}.zip`, (err) => {
      if (err) {
        logger.error('Download error:', err);
        res.status(500).json({
          error: 'Download Error',
          message: 'Failed to download file',
        });
      }
    });
  } catch (error) {
    logger.error('GDPR download error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process download',
    });
  }
});

/**
 * POST /api/gdpr/consent
 * Record or update GDPR consent
 */
gdprRouter.post(
  '/consent',
  [
    body('consentType').notEmpty().withMessage('Consent type is required'),
    body('granted').isBoolean().withMessage('Granted must be a boolean'),
    body('legalBasis')
      .isIn([
        'consent',
        'legitimate_interest',
        'contract',
        'legal_obligation',
        'vital_interests',
        'public_task',
      ])
      .withMessage('Invalid legal basis'),
  ],
  async (req: AuthenticatedRequest, res: any): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
        });
        return;
      }

      const { consentType, granted, legalBasis, description } = req.body;
      const userId = req.user!.userId;
      const tenantId = req.user!.tenantId;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Upsert consent record
      const consent = await prisma.gDPRConsent.upsert({
        where: {
          tenantId_userId_consentType: {
            tenantId,
            userId,
            consentType,
          },
        },
        update: {
          granted,
          revokedAt: granted ? null : new Date(),
          ipAddress,
          userAgent,
          legalBasis,
          description,
        },
        create: {
          tenantId,
          userId,
          consentType,
          granted,
          grantedAt: new Date(),
          revokedAt: granted ? null : new Date(),
          ipAddress,
          userAgent,
          legalBasis,
          description: description || '',
        },
      });

      logger.info(`GDPR consent ${granted ? 'granted' : 'revoked'}`, {
        userId,
        tenantId,
        consentType,
        granted,
      });

      res.json({
        success: true,
        message: `Consent ${granted ? 'granted' : 'revoked'} successfully`,
        data: { consent: { id: consent.id, consentType, granted } },
      });
    } catch (error) {
      logger.error('GDPR consent error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update consent',
      });
    }
  }
);

/**
 * GET /api/gdpr/consents
 * Get user's current consents
 */
gdprRouter.get('/consents', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const consents = await prisma.gDPRConsent.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: { grantedAt: 'desc' },
    });

    res.json({
      success: true,
      data: { consents },
    });
  } catch (error) {
    logger.error('Get GDPR consents error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve consents',
    });
  }
});

// Async function to process data export
async function processDataExport(requestId: number) {
  try {
    // Update status to processing
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'processing',
        processedAt: new Date(),
      },
    });

    const exportRequest = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
      include: { user: true, tenant: true },
    });

    if (!exportRequest) {
      throw new Error('Export request not found');
    }

    // Create export directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `export-${requestId}-${Date.now()}.zip`;
    const filepath = path.join(exportDir, filename);

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(filepath);

    archive.pipe(output);

    // Collect user data
    const userData = {
      user: {
        id: exportRequest.user.id,
        username: exportRequest.user.username,
        email: exportRequest.user.email,
        firstName: exportRequest.user.firstName,
        lastName: exportRequest.user.lastName,
        role: exportRequest.user.role,
        createdAt: exportRequest.user.createdAt,
        lastLogin: exportRequest.user.lastLogin,
      },
      tenant: {
        name: exportRequest.tenant.name,
        subdomain: exportRequest.tenant.subdomain,
      },
    };

    // Get user's films
    const films = await prisma.film.findMany({
      where: {
        tenantId: exportRequest.tenantId,
        // Assuming there's a way to link films to users (e.g., submitter email)
        contactEmail: exportRequest.user.email,
      },
    });

    // Get user's GDPR consents
    const consents = await prisma.gDPRConsent.findMany({
      where: {
        userId: exportRequest.userId,
        tenantId: exportRequest.tenantId,
      },
    });

    // Add data to archive
    archive.append(JSON.stringify(userData, null, 2), { name: 'user-profile.json' });
    archive.append(JSON.stringify(films, null, 2), { name: 'film-submissions.json' });
    archive.append(JSON.stringify(consents, null, 2), { name: 'gdpr-consents.json' });

    // Add metadata
    const metadata = {
      exportedAt: new Date().toISOString(),
      requestId: requestId,
      dataTypes: ['user-profile', 'film-submissions', 'gdpr-consents'],
      format: 'JSON',
      version: '1.0',
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'export-metadata.json' });

    await archive.finalize();

    // Update export request with download URL and expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        downloadUrl: filename,
        expiresAt,
      },
    });

    logger.info(`Data export completed`, { requestId, filename });

    // Send email notification to user
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await emailService.sendGDPRExportReady(exportRequest.tenantId, {
      email: exportRequest.user.email,
      firstName: exportRequest.user.firstName || undefined,
      lastName: exportRequest.user.lastName || undefined,
      downloadUrl: `${frontendUrl}/api/gdpr/download/${requestId}`,
      expiresAt,
    });
  } catch (error) {
    logger.error('Data export processing error:', error);

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

// Async function to process data deletion
async function processDataDeletion(requestId: number) {
  try {
    // Update status to processing
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'processing',
        processedAt: new Date(),
      },
    });

    const exportRequest = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!exportRequest) {
      throw new Error('Deletion request not found');
    }

    // Perform data deletion (this is a simplified version)
    // In a real implementation, you'd need to carefully handle foreign key constraints
    // and decide what data to actually delete vs. anonymize

    // Anonymize user data instead of hard deletion
    await prisma.adminUser.update({
      where: { id: exportRequest.userId },
      data: {
        username: `deleted-user-${exportRequest.userId}`,
        email: `deleted-${exportRequest.userId}@example.com`,
        firstName: 'Deleted',
        lastName: 'User',
        isActive: false,
      },
    });

    // Delete or anonymize related data
    await prisma.gDPRConsent.deleteMany({
      where: {
        userId: exportRequest.userId,
        tenantId: exportRequest.tenantId,
      },
    });

    // Update request status
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    logger.info(`Data deletion completed`, { requestId, userId: exportRequest.userId });

    // Send email confirmation to user (to the original email before anonymization)
    // Note: We stored the original email before deletion for this purpose
    const originalEmail = exportRequest.user.email;
    if (!originalEmail.startsWith('deleted-')) {
      await emailService.sendGDPRDeletionConfirmation(exportRequest.tenantId, {
        email: originalEmail,
        firstName: exportRequest.user.firstName || undefined,
        lastName: exportRequest.user.lastName || undefined,
      });
    }
  } catch (error) {
    logger.error('Data deletion processing error:', error);

    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
