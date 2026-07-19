import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';

/**
 * Prometheus Metrics Middleware
 * Collects and exposes application metrics for monitoring
 */

// Create a Registry to register metrics
export const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'filmfestkit_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

/**
 * HTTP Request Duration Histogram
 * Tracks response times for all HTTP requests
 */
export const httpRequestDuration = new client.Histogram({
  name: 'filmfestkit_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Response time buckets
  registers: [register],
});

/**
 * HTTP Request Counter
 * Counts total number of HTTP requests
 */
export const httpRequestTotal = new client.Counter({
  name: 'filmfestkit_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Active Connections Gauge
 * Tracks current number of active connections
 */
export const activeConnections = new client.Gauge({
  name: 'filmfestkit_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

/**
 * Database Query Duration Histogram
 * Tracks database query performance
 */
export const dbQueryDuration = new client.Histogram({
  name: 'filmfestkit_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

/**
 * Database Query Counter
 * Counts total database queries
 */
export const dbQueryTotal = new client.Counter({
  name: 'filmfestkit_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model'],
  registers: [register],
});

/**
 * Authentication Counter
 * Tracks authentication attempts and success/failures
 */
export const authAttempts = new client.Counter({
  name: 'filmfestkit_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result'], // success or failure
  registers: [register],
});

/**
 * File Upload Counter
 * Tracks file uploads
 */
export const fileUploads = new client.Counter({
  name: 'filmfestkit_file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['status'], // success or failure
  registers: [register],
});

/**
 * File Upload Size Histogram
 * Tracks file upload sizes
 */
export const fileUploadSize = new client.Histogram({
  name: 'filmfestkit_file_upload_size_bytes',
  help: 'Size of uploaded files in bytes',
  buckets: [
    1024, // 1KB
    10240, // 10KB
    102400, // 100KB
    1048576, // 1MB
    10485760, // 10MB
    104857600, // 100MB
  ],
  registers: [register],
});

/**
 * Payment Processing Counter
 * Tracks payment processing
 */
export const payments = new client.Counter({
  name: 'filmfestkit_payments_total',
  help: 'Total number of payment transactions',
  labelNames: ['status'], // success, failed, pending
  registers: [register],
});

/**
 * Cache Hit/Miss Counter
 * Tracks Redis cache performance
 */
export const cacheHits = new client.Counter({
  name: 'filmfestkit_cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: 'filmfestkit_cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register],
});

/**
 * Middleware to collect HTTP metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Increment active connections
  activeConnections.inc();

  const start = Date.now();

  // Decrement active connections when response finishes
  res.on('finish', () => {
    activeConnections.dec();

    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';

    // Record metrics
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);

    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();

    // Log slow requests (>1s)
    if (duration > 1) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: route,
        duration: `${duration.toFixed(2)}s`,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

/**
 * Metrics endpoint handler
 * Returns Prometheus-formatted metrics
 */
export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
};

/**
 * Helper function to track database queries
 * Use this in your Prisma middleware or service layer
 */
export function trackDatabaseQuery(operation: string, model: string, duration: number): void {
  dbQueryDuration.labels(operation, model).observe(duration / 1000); // Convert ms to seconds
  dbQueryTotal.labels(operation, model).inc();
}

/**
 * Helper function to track authentication attempts
 */
export function trackAuthAttempt(success: boolean): void {
  authAttempts.labels(success ? 'success' : 'failure').inc();
}

/**
 * Helper function to track file uploads
 */
export function trackFileUpload(sizeBytes: number, success: boolean): void {
  if (success) {
    fileUploads.labels('success').inc();
    fileUploadSize.observe(sizeBytes);
  } else {
    fileUploads.labels('failure').inc();
  }
}

/**
 * Helper function to track payments
 */
export function trackPayment(status: 'success' | 'failed' | 'pending'): void {
  payments.labels(status).inc();
}

/**
 * Helper function to track cache hits/misses
 */
export function trackCacheHit(hit: boolean): void {
  if (hit) {
    cacheHits.inc();
  } else {
    cacheMisses.inc();
  }
}

/**
 * Get current metrics summary (for health checks or debugging)
 */
export async function getMetricsSummary(): Promise<Record<string, any>> {
  const metrics = await register.getMetricsAsJSON();
  return metrics.reduce(
    (acc, metric) => {
      acc[metric.name] = metric;
      return acc;
    },
    {} as Record<string, any>
  );
}
