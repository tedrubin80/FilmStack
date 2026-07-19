import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export type StorageProvider = 'local';

interface UploadResult {
  key: string;
  url: string;
  provider: StorageProvider;
  size: number;
}

class FileStorageService {
  private localPath: string;

  constructor() {
    this.localPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
    logger.info(`Local storage initialized at ${this.localPath}`);
  }

  /**
   * Generate a unique file key with optional prefix
   */
  generateKey(originalFilename: string, prefix: string = ''): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const safeName = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    return `${prefix}${timestamp}_${hash}_${safeName}${ext}`;
  }

  async uploadFile(
    sourcePath: string,
    key: string,
    _contentType: string
  ): Promise<UploadResult> {
    const fileBuffer = await fs.readFile(sourcePath);
    return this.uploadToLocal(fileBuffer, key, fileBuffer.length);
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    _contentType: string
  ): Promise<UploadResult> {
    return this.uploadToLocal(buffer, key, buffer.length);
  }

  private async uploadToLocal(
    buffer: Buffer,
    key: string,
    size: number
  ): Promise<UploadResult> {
    const filePath = path.join(this.localPath, key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

    logger.info(`File uploaded to local storage: ${key}`);

    return {
      key,
      url: filePath,
      provider: 'local',
      size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.localPath, key);
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted from local storage: ${key}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      logger.warn(`File not found for deletion: ${key}`);
    }
  }

  async getDownloadUrl(key: string, _expiresIn: number = 3600): Promise<string> {
    return path.join(this.localPath, key);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.localPath, key));
      return true;
    } catch {
      return false;
    }
  }

  getProvider(): StorageProvider {
    return 'local';
  }

  getStorageInfo(): { provider: StorageProvider; path?: string } {
    return {
      provider: 'local',
      path: this.localPath,
    };
  }
}

export const fileStorage = new FileStorageService();
export default fileStorage;
