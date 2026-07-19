import { EmailTemplate, EmailLog } from '@prisma/client';
import nodemailer from 'nodemailer';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';

interface EmailTemplateData {
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: string[];
}

interface SendEmailData {
  recipientEmail: string;
  templateName: string;
  variables?: { [key: string]: string };
  subject?: string; // Override template subject
}

export class EmailService {
  private prisma = prisma;
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // Support both EMAIL_* and SMTP_* naming conventions
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS;
    const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const emailPort = process.env.EMAIL_PORT || process.env.SMTP_PORT || '587';

    const emailConfig: nodemailer.TransportOptions = {
      host: emailHost,
      port: parseInt(emailPort),
      secure: emailPort === '465', // true for 465, false for other ports
      auth: emailUser && emailPass ? {
        user: emailUser,
        pass: emailPass,
      } : undefined,
    } as nodemailer.TransportOptions;

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection on startup (non-blocking)
    if (emailUser && emailPass) {
      this.transporter.verify().then(() => {
        logger.info('Email transporter connected successfully');
      }).catch((error) => {
        logger.warn('Email transporter connection failed:', error.message);
      });
    } else {
      logger.warn('Email credentials not configured - email sending disabled');
    }
  }

  async createEmailTemplate(
    tenantId: number,
    templateData: EmailTemplateData
  ): Promise<EmailTemplate> {
    try {
      const template = await this.prisma.emailTemplate.create({
        data: {
          tenantId,
          name: templateData.name,
          subject: templateData.subject,
          htmlBody: templateData.htmlBody,
          textBody: templateData.textBody,
          variables: JSON.stringify(templateData.variables || []),
        },
      });

      logger.info(`Email template created: ${template.id} - ${template.name}`);
      return template;
    } catch (error) {
      logger.error('Error creating email template:', error);
      throw error;
    }
  }

  async getEmailTemplates(tenantId: number): Promise<EmailTemplate[]> {
    try {
      return await this.prisma.emailTemplate.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching email templates:', error);
      throw error;
    }
  }

  async sendEmail(tenantId: number, emailData: SendEmailData): Promise<EmailLog> {
    try {
      // Get template
      const template = await this.prisma.emailTemplate.findFirst({
        where: {
          tenantId,
          name: emailData.templateName,
          isActive: true,
        },
      });

      if (!template) {
        throw new Error(`Email template '${emailData.templateName}' not found`);
      }

      // Process variables in subject and body
      let subject = emailData.subject || template.subject;
      let htmlBody = template.htmlBody;
      let textBody = template.textBody || '';

      if (emailData.variables) {
        // HTML-escape values to prevent XSS in email templates
        const escapeHtml = (str: string) =>
          String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        Object.entries(emailData.variables).forEach(([key, value]) => {
          // Escape regex special chars in key to prevent ReDoS
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const placeholder = `\\{\\{${escapedKey}\\}\\}`;
          const safeValue = escapeHtml(value);
          subject = subject.replace(new RegExp(placeholder, 'g'), value); // Subject is plain text
          htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), safeValue); // HTML body gets escaped
          textBody = textBody.replace(new RegExp(placeholder, 'g'), value); // Text body is plain text
        });
      }

      // Create email log entry
      const emailLog = await this.prisma.emailLog.create({
        data: {
          tenantId,
          templateId: template.id,
          recipientEmail: emailData.recipientEmail,
          subject,
          status: 'pending',
        },
      });

      try {
        // Send email
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: emailData.recipientEmail,
          subject,
          html: htmlBody,
          text: textBody,
        };

        await this.transporter.sendMail(mailOptions);

        // Update log status
        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        logger.info(`Email sent successfully: ${emailLog.id} to ${emailData.recipientEmail}`);
      } catch (error) {
        // Update log with error
        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        logger.error(`Email sending failed: ${emailLog.id}`, error);
        throw error;
      }

      return emailLog;
    } catch (error) {
      logger.error('Error in sendEmail:', error);
      throw error;
    }
  }

  async sendFilmSubmissionConfirmation(
    tenantId: number,
    filmData: {
      title: string;
      director?: string;
      contactEmail?: string;
      festivalName: string;
    }
  ): Promise<void> {
    if (!filmData.contactEmail) {
      logger.warn('No contact email provided for film submission confirmation');
      return;
    }

    const variables = {
      filmTitle: filmData.title,
      director: filmData.director || 'Not specified',
      festivalName: filmData.festivalName,
      submissionDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: filmData.contactEmail,
        templateName: 'film_submission_confirmation',
        variables,
      });
    } catch (error) {
      logger.error('Error sending film submission confirmation:', error);
      // Don't throw error - this is a background task
    }
  }

  async sendFilmStatusUpdate(
    tenantId: number,
    filmData: {
      title: string;
      director?: string;
      contactEmail?: string;
      status: string;
      festivalName: string;
      notes?: string;
    }
  ): Promise<void> {
    if (!filmData.contactEmail) {
      logger.warn('No contact email provided for film status update');
      return;
    }

    const variables = {
      filmTitle: filmData.title,
      director: filmData.director || 'Not specified',
      festivalName: filmData.festivalName,
      status: filmData.status,
      statusMessage: this.getStatusMessage(filmData.status),
      notes: filmData.notes || '',
      updateDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: filmData.contactEmail,
        templateName: 'film_status_update',
        variables,
      });
    } catch (error) {
      logger.error('Error sending film status update:', error);
      // Don't throw error - this is a background task
    }
  }

  async sendPaymentConfirmation(
    tenantId: number,
    paymentData: {
      customerEmail?: string;
      customerName?: string;
      amount: number;
      currency: string;
      description?: string;
      festivalName: string;
    }
  ): Promise<void> {
    if (!paymentData.customerEmail) {
      logger.warn('No customer email provided for payment confirmation');
      return;
    }

    const variables = {
      customerName: paymentData.customerName || 'Valued Customer',
      amount: paymentData.amount.toFixed(2),
      currency: paymentData.currency.toUpperCase(),
      description: paymentData.description || 'Festival entry fee',
      festivalName: paymentData.festivalName,
      paymentDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: paymentData.customerEmail,
        templateName: 'payment_confirmation',
        variables,
      });
    } catch (error) {
      logger.error('Error sending payment confirmation:', error);
      // Don't throw error - this is a background task
    }
  }

  async sendJudgeInvitation(
    tenantId: number,
    judgeData: {
      email: string;
      firstName: string;
      lastName: string;
      festivalName: string;
      inviteLink?: string;
    }
  ): Promise<void> {
    const variables = {
      firstName: judgeData.firstName,
      lastName: judgeData.lastName,
      festivalName: judgeData.festivalName,
      inviteLink: judgeData.inviteLink || '',
      inviteDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: judgeData.email,
        templateName: 'judge_invitation',
        variables,
      });
    } catch (error) {
      logger.error('Error sending judge invitation:', error);
      // Don't throw error - this is a background task
    }
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Congratulations! Your film has been accepted.';
      case 'rejected':
        return 'Unfortunately, your film was not selected this time.';
      case 'withdrawn':
        return 'Your film submission has been withdrawn.';
      case 'pending':
        return 'Your film is currently under review.';
      default:
        return 'Your film status has been updated.';
    }
  }

  async getEmailLogs(
    tenantId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: EmailLog[]; total: number; hasMore: boolean }> {
    try {
      const where = { tenantId };

      const [logs, total] = await Promise.all([
        this.prisma.emailLog.findMany({
          where,
          include: {
            template: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.emailLog.count({ where }),
      ]);

      const hasMore = page * limit < total;

      return { logs, total, hasMore };
    } catch (error) {
      logger.error('Error fetching email logs:', error);
      throw error;
    }
  }

  async getEmailStatistics(tenantId: number) {
    try {
      const [totalEmails, sentEmails, failedEmails, pendingEmails] = await Promise.all([
        this.prisma.emailLog.count({
          where: { tenantId },
        }),
        this.prisma.emailLog.count({
          where: { tenantId, status: 'sent' },
        }),
        this.prisma.emailLog.count({
          where: { tenantId, status: 'failed' },
        }),
        this.prisma.emailLog.count({
          where: { tenantId, status: 'pending' },
        }),
      ]);

      const deliveryRate = totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0;

      return {
        totalEmails,
        sentEmails,
        failedEmails,
        pendingEmails,
        deliveryRate,
      };
    } catch (error) {
      logger.error('Error getting email statistics:', error);
      throw error;
    }
  }

  async sendGDPRExportReady(
    tenantId: number,
    userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      downloadUrl: string;
      expiresAt: Date;
    }
  ): Promise<void> {
    const variables = {
      firstName: userData.firstName || 'User',
      lastName: userData.lastName || '',
      downloadUrl: userData.downloadUrl,
      expiresAt: userData.expiresAt.toLocaleDateString(),
      exportDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: userData.email,
        templateName: 'gdpr_export_ready',
        variables,
      });
    } catch (error) {
      logger.error('Error sending GDPR export ready notification:', error);
    }
  }

  async sendGDPRDeletionConfirmation(
    tenantId: number,
    userData: {
      email: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<void> {
    const variables = {
      firstName: userData.firstName || 'User',
      lastName: userData.lastName || '',
      deletionDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: userData.email,
        templateName: 'gdpr_deletion_confirmation',
        variables,
      });
    } catch (error) {
      logger.error('Error sending GDPR deletion confirmation:', error);
    }
  }

  async sendGDPRRequestReceived(
    tenantId: number,
    userData: {
      email: string;
      firstName?: string;
      lastName?: string;
      requestType: 'export' | 'deletion';
    }
  ): Promise<void> {
    const variables = {
      firstName: userData.firstName || 'User',
      lastName: userData.lastName || '',
      requestType: userData.requestType,
      requestDate: new Date().toLocaleDateString(),
    };

    try {
      await this.sendEmail(tenantId, {
        recipientEmail: userData.email,
        templateName: 'gdpr_request_received',
        variables,
      });
    } catch (error) {
      logger.error('Error sending GDPR request received notification:', error);
    }
  }

  async createDefaultTemplates(tenantId: number): Promise<void> {
    const defaultTemplates = [
      {
        name: 'film_submission_confirmation',
        subject: 'Film Submission Confirmation - {{festivalName}}',
        htmlBody: `
          <h2>Film Submission Confirmed</h2>
          <p>Dear {{director}},</p>
          <p>Thank you for submitting your film "<strong>{{filmTitle}}</strong>" to {{festivalName}}.</p>
          <p>Your submission was received on {{submissionDate}} and is now under review.</p>
          <p>We will notify you of the status of your submission as soon as possible.</p>
          <p>Best regards,<br>{{festivalName}} Team</p>
        `,
        textBody: `Film Submission Confirmed\n\nDear {{director}},\n\nThank you for submitting your film "{{filmTitle}}" to {{festivalName}}.\n\nYour submission was received on {{submissionDate}} and is now under review.\n\nWe will notify you of the status of your submission as soon as possible.\n\nBest regards,\n{{festivalName}} Team`,
        variables: ['filmTitle', 'director', 'festivalName', 'submissionDate'],
      },
      {
        name: 'film_status_update',
        subject: 'Film Status Update - {{filmTitle}}',
        htmlBody: `
          <h2>Film Status Update</h2>
          <p>Dear {{director}},</p>
          <p>We have an update regarding your film "<strong>{{filmTitle}}</strong>" submitted to {{festivalName}}.</p>
          <p><strong>Status:</strong> {{status}}</p>
          <p>{{statusMessage}}</p>
          {{#if notes}}<p><strong>Notes:</strong> {{notes}}</p>{{/if}}
          <p>Updated on: {{updateDate}}</p>
          <p>Best regards,<br>{{festivalName}} Team</p>
        `,
        textBody: `Film Status Update\n\nDear {{director}},\n\nWe have an update regarding your film "{{filmTitle}}" submitted to {{festivalName}}.\n\nStatus: {{status}}\n\n{{statusMessage}}\n\nNotes: {{notes}}\n\nUpdated on: {{updateDate}}\n\nBest regards,\n{{festivalName}} Team`,
        variables: [
          'filmTitle',
          'director',
          'festivalName',
          'status',
          'statusMessage',
          'notes',
          'updateDate',
        ],
      },
      {
        name: 'payment_confirmation',
        subject: 'Payment Confirmation - {{festivalName}}',
        htmlBody: `
          <h2>Payment Confirmation</h2>
          <p>Dear {{customerName}},</p>
          <p>Thank you for your payment to {{festivalName}}.</p>
          <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Date:</strong> {{paymentDate}}</p>
          <p>Your payment has been successfully processed.</p>
          <p>Best regards,<br>{{festivalName}} Team</p>
        `,
        textBody: `Payment Confirmation\n\nDear {{customerName}},\n\nThank you for your payment to {{festivalName}}.\n\nAmount: {{amount}} {{currency}}\nDescription: {{description}}\nDate: {{paymentDate}}\n\nYour payment has been successfully processed.\n\nBest regards,\n{{festivalName}} Team`,
        variables: [
          'customerName',
          'festivalName',
          'amount',
          'currency',
          'description',
          'paymentDate',
        ],
      },
      {
        name: 'judge_invitation',
        subject: 'Judge Invitation - {{festivalName}}',
        htmlBody: `
          <h2>Judge Invitation</h2>
          <p>Dear {{firstName}} {{lastName}},</p>
          <p>You have been invited to be a judge for {{festivalName}}.</p>
          <p>We would be honored to have your expertise in evaluating the submitted films.</p>
          {{#if inviteLink}}<p><a href="{{inviteLink}}">Click here to accept the invitation</a></p>{{/if}}
          <p>Invitation sent on: {{inviteDate}}</p>
          <p>Best regards,<br>{{festivalName}} Team</p>
        `,
        textBody: `Judge Invitation\n\nDear {{firstName}} {{lastName}},\n\nYou have been invited to be a judge for {{festivalName}}.\n\nWe would be honored to have your expertise in evaluating the submitted films.\n\nInvite Link: {{inviteLink}}\n\nInvitation sent on: {{inviteDate}}\n\nBest regards,\n{{festivalName}} Team`,
        variables: ['firstName', 'lastName', 'festivalName', 'inviteLink', 'inviteDate'],
      },
      {
        name: 'gdpr_request_received',
        subject: 'Your Data Request Has Been Received',
        htmlBody: `
          <h2>Data Request Received</h2>
          <p>Dear {{firstName}} {{lastName}},</p>
          <p>We have received your data {{requestType}} request on {{requestDate}}.</p>
          <p>We are processing your request and will notify you once it is complete.</p>
          <p>In compliance with GDPR, we will complete your request within 30 days.</p>
          <p>Best regards,<br>FilmFestKit Team</p>
        `,
        textBody: `Data Request Received\n\nDear {{firstName}} {{lastName}},\n\nWe have received your data {{requestType}} request on {{requestDate}}.\n\nWe are processing your request and will notify you once it is complete.\n\nIn compliance with GDPR, we will complete your request within 30 days.\n\nBest regards,\nFilmFestKit Team`,
        variables: ['firstName', 'lastName', 'requestType', 'requestDate'],
      },
      {
        name: 'gdpr_export_ready',
        subject: 'Your Data Export is Ready for Download',
        htmlBody: `
          <h2>Data Export Ready</h2>
          <p>Dear {{firstName}} {{lastName}},</p>
          <p>Your data export is now ready for download.</p>
          <p><a href="{{downloadUrl}}">Click here to download your data</a></p>
          <p><strong>Important:</strong> This download link will expire on {{expiresAt}}.</p>
          <p>Your export includes:</p>
          <ul>
            <li>Your profile information</li>
            <li>Film submissions</li>
            <li>Consent records</li>
          </ul>
          <p>Best regards,<br>FilmFestKit Team</p>
        `,
        textBody: `Data Export Ready\n\nDear {{firstName}} {{lastName}},\n\nYour data export is now ready for download.\n\nDownload URL: {{downloadUrl}}\n\nImportant: This download link will expire on {{expiresAt}}.\n\nYour export includes:\n- Your profile information\n- Film submissions\n- Consent records\n\nBest regards,\nFilmFestKit Team`,
        variables: ['firstName', 'lastName', 'downloadUrl', 'expiresAt', 'exportDate'],
      },
      {
        name: 'gdpr_deletion_confirmation',
        subject: 'Your Data Has Been Deleted',
        htmlBody: `
          <h2>Data Deletion Confirmation</h2>
          <p>Dear {{firstName}} {{lastName}},</p>
          <p>As requested, your personal data has been deleted from our system on {{deletionDate}}.</p>
          <p>Please note that:</p>
          <ul>
            <li>Your account has been anonymized</li>
            <li>Personal data has been permanently removed</li>
            <li>Some data may be retained for legal compliance</li>
          </ul>
          <p>If you have any questions, please contact our support team.</p>
          <p>Best regards,<br>FilmFestKit Team</p>
        `,
        textBody: `Data Deletion Confirmation\n\nDear {{firstName}} {{lastName}},\n\nAs requested, your personal data has been deleted from our system on {{deletionDate}}.\n\nPlease note that:\n- Your account has been anonymized\n- Personal data has been permanently removed\n- Some data may be retained for legal compliance\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nFilmFestKit Team`,
        variables: ['firstName', 'lastName', 'deletionDate'],
      },
    ];

    for (const templateData of defaultTemplates) {
      try {
        // Check if template already exists
        const existing = await this.prisma.emailTemplate.findFirst({
          where: {
            tenantId,
            name: templateData.name,
          },
        });

        if (!existing) {
          await this.createEmailTemplate(tenantId, templateData);
        }
      } catch (error) {
        logger.error(`Error creating default template ${templateData.name}:`, error);
      }
    }
  }
}

export default new EmailService();
