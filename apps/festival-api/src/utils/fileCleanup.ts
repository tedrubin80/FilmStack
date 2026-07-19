import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

const TEMP_UPLOAD_DIR = '/tmp/festival-uploads/temp';
const MAX_TEMP_FILE_AGE_MS = 60 * 60 * 1000; // 1 hour

interface CleanupResult {
  deletedCount: number;
  failedCount: number;
  bytesFreed: number;
}

/**
 * Clean up temporary upload files older than the specified age
 */
export async function cleanupTempFiles(
  maxAgeMs: number = MAX_TEMP_FILE_AGE_MS
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedCount: 0,
    failedCount: 0,
    bytesFreed: 0,
  };

  try {
    // Ensure temp directory exists
    try {
      await fs.access(TEMP_UPLOAD_DIR);
    } catch {
      logger.info('Temp upload directory does not exist, nothing to clean');
      return result;
    }

    const files = await fs.readdir(TEMP_UPLOAD_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(TEMP_UPLOAD_DIR, file);

      try {
        const stats = await fs.stat(filePath);

        // Skip directories
        if (stats.isDirectory()) {
          continue;
        }

        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          await fs.unlink(filePath);
          result.deletedCount++;
          result.bytesFreed += stats.size;
          logger.debug(`Deleted temp file: ${file} (age: ${Math.round(fileAge / 1000)}s)`);
        }
      } catch (error) {
        result.failedCount++;
        logger.warn(`Failed to process temp file ${file}:`, error);
      }
    }

    if (result.deletedCount > 0) {
      logger.info(
        `Temp file cleanup: deleted ${result.deletedCount} files, freed ${formatBytes(result.bytesFreed)}`
      );
    }
  } catch (error) {
    logger.error('Error during temp file cleanup:', error);
  }

  return result;
}

/**
 * Clean up orphaned upload directories (films that were deleted)
 */
export async function cleanupOrphanedUploads(
  activeFilmIds: number[]
): Promise<CleanupResult> {
  const uploadDir = process.env.UPLOAD_PATH || '/var/www/filmfestkit/uploads';
  const filmsDir = path.join(uploadDir, 'films');
  const result: CleanupResult = {
    deletedCount: 0,
    failedCount: 0,
    bytesFreed: 0,
  };

  try {
    // Ensure films directory exists
    try {
      await fs.access(filmsDir);
    } catch {
      return result;
    }

    const dirs = await fs.readdir(filmsDir);
    const activeIdSet = new Set(activeFilmIds.map(String));

    for (const dir of dirs) {
      // Skip if this film ID is still active
      if (activeIdSet.has(dir)) {
        continue;
      }

      const dirPath = path.join(filmsDir, dir);

      try {
        const stats = await fs.stat(dirPath);

        if (stats.isDirectory()) {
          const bytes = await getDirectorySize(dirPath);
          await fs.rm(dirPath, { recursive: true, force: true });
          result.deletedCount++;
          result.bytesFreed += bytes;
          logger.info(`Deleted orphaned upload directory: ${dir}`);
        }
      } catch (error) {
        result.failedCount++;
        logger.warn(`Failed to delete orphaned directory ${dir}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error during orphaned upload cleanup:', error);
  }

  return result;
}

/**
 * Get total size of a directory recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Ignore errors for size calculation
  }

  return totalSize;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Initialize cleanup directory structure
 */
export async function initializeUploadDirectories(): Promise<void> {
  const directories = [
    TEMP_UPLOAD_DIR,
    process.env.UPLOAD_PATH || '/var/www/filmfestkit/uploads',
    path.join(process.env.UPLOAD_PATH || '/var/www/filmfestkit/uploads', 'films'),
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.warn(`Could not create directory ${dir}:`, error);
    }
  }

  logger.info('Upload directories initialized');
}

/**
 * Start periodic cleanup task
 */
export function startCleanupScheduler(intervalMs: number = 15 * 60 * 1000): NodeJS.Timeout {
  // Run initial cleanup after 1 minute
  setTimeout(() => {
    cleanupTempFiles().catch((err) => logger.error('Scheduled cleanup failed:', err));
  }, 60 * 1000);

  // Schedule recurring cleanup
  const interval = setInterval(() => {
    cleanupTempFiles().catch((err) => logger.error('Scheduled cleanup failed:', err));
  }, intervalMs);

  logger.info(`File cleanup scheduler started (interval: ${intervalMs / 1000}s)`);

  return interval;
}

export default {
  cleanupTempFiles,
  cleanupOrphanedUploads,
  initializeUploadDirectories,
  startCleanupScheduler,
};
