import winston from 'winston';
import path from 'path';
import { sanitizeForLogging } from './sanitize';

const logDir = path.join(process.cwd(), 'logs');

const sanitizeFormat = winston.format((info) => {
  const sanitized = sanitizeForLogging(info);
  if (sanitized.body) sanitized.body = sanitizeForLogging(sanitized.body);
  if (sanitized.headers) sanitized.headers = sanitizeForLogging(sanitized.headers);
  if (sanitized.details) sanitized.details = sanitizeForLogging(sanitized.details);
  return sanitized;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  sanitizeFormat(),
  winston.format.json(),
);

const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'filmstack-festival-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 5242880, maxFiles: 5 }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            }),
          ),
        })]
      : []),
  ],
  exceptionHandlers: [new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })],
  rejectionHandlers: [new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })],
});

export const morganStream = {
  write: (message: string) => { logger.info(message.trim()); },
};
