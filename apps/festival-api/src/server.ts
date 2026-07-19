import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { prisma } from '@filmstack/shared-db';
import { initRedis, closeRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { csrfProtection, csrfTokenEndpoint, csrfErrorHandler } from './middleware/csrf';
import {
  generalRateLimiter,
  apiWriteRateLimiter,
  apiReadRateLimiter,
} from './middleware/rateLimiting';
import { authRouter } from './routes/auth';
import { tenantsRouter } from './routes/tenants';
import { festivalsRouter } from './routes/festivals';
import { filmsRouter } from './routes/films';
import { videoRoomsRouter } from './routes/videoRooms';
import { apiKeysRouter } from './routes/apiKeys';
import judgesRouter from './routes/judges';
import paymentsRouter from './routes/payments';
import emailsRouter from './routes/emails';
import { platformAdminRouter } from './routes/platformAdmin';
import { bridgeRouter } from './routes/bridge';
import { awardsRouter } from './routes/awards';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust only the first proxy hop (nginx)
app.set('trust proxy', 1);

// Request ID tracing (must be before other middleware)
app.use(requestIdMiddleware);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'production' ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }),
);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalRateLimiter);
app.use(csrfProtection);

// Health check (no auth/CSRF required)
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// CSRF token endpoint
app.get('/api/csrf-token', csrfTokenEndpoint);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/tenants', apiWriteRateLimiter, tenantsRouter);
app.use('/api/festivals', apiReadRateLimiter, apiWriteRateLimiter, tenantMiddleware, festivalsRouter);
app.use('/api/films', apiReadRateLimiter, apiWriteRateLimiter, tenantMiddleware, filmsRouter);
app.use('/api/judges', apiWriteRateLimiter, tenantMiddleware, judgesRouter);
app.use('/api/payments', apiWriteRateLimiter, paymentsRouter);
app.use('/api/emails', tenantMiddleware, emailsRouter);
app.use('/api/video-rooms', apiWriteRateLimiter, tenantMiddleware, videoRoomsRouter);
app.use('/api/api-keys', apiWriteRateLimiter, tenantMiddleware, apiKeysRouter);
app.use('/api/awards', apiWriteRateLimiter, tenantMiddleware, awardsRouter);
app.use('/api/platform-admin', apiWriteRateLimiter, platformAdminRouter);
app.use('/api/bridge', bridgeRouter); // Cross-service endpoints (streaming → festival)

// 404 + error handlers (must be last)
app.use('*', notFoundHandler);
app.use(csrfErrorHandler);
app.use(errorHandler);

// Graceful shutdown
let httpServer: ReturnType<typeof app.listen> | null = null;

const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  const forceKill = setTimeout(() => { process.exit(1); }, 30000);
  forceKill.unref();

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => err ? reject(err) : resolve());
      });
    }
    await closeRedis();
    await prisma.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const startServer = async () => {
  try {
    initRedis();
    await prisma.$connect();
    logger.info('Database connected');

    httpServer = app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Festival API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, prisma };
