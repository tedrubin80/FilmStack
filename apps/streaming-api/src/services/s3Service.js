const fs = require('fs').promises;
const path = require('path');

/**
 * Local object storage for streaming uploads.
 * Replaces the former AWS S3 client — files stay on disk (or under UPLOAD_PATH).
 */
class LocalObjectStorage {
  constructor() {
    this.rootDir = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
    this.cdnUrl = (process.env.CDN_HOSTNAME || process.env.BUNNY_CDN_URL || '').replace(/\/$/, '');
  }

  async uploadFile(filePath, objectKey, metadata = {}) {
    const destPath = path.join(this.rootDir, objectKey);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(filePath, destPath);

    const localUrl = destPath;
    const cdnUrl = this.cdnUrl ? `${this.cdnUrl}/${objectKey}` : localUrl;

    console.log(`Uploaded to local storage: ${objectKey}`);
    return {
      s3Url: localUrl,
      cdnUrl,
      key: objectKey,
      etag: null,
      metadata,
    };
  }

  async uploadVideoFiles(videoId, processedDir) {
    const uploads = [];
    const files = await fs.readdir(processedDir);

    for (const file of files) {
      const filePath = path.join(processedDir, file);
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;

      let objectKey;
      if (file.endsWith('.mp4')) {
        objectKey = `videos/${videoId}/${file}`;
      } else if (file.endsWith('.jpg') || file.endsWith('.png')) {
        objectKey = `thumbnails/${videoId}/${file}`;
      } else if (file.endsWith('.m3u8') || file.endsWith('.ts')) {
        objectKey = `videos/${videoId}/hls/${file}`;
      } else {
        objectKey = `videos/${videoId}/${file}`;
      }

      uploads.push(
        await this.uploadFile(filePath, objectKey, {
          videoId,
          uploadDate: new Date().toISOString(),
        })
      );
    }

    const hlsDir = path.join(processedDir, 'hls');
    try {
      const hlsFiles = await fs.readdir(hlsDir);
      for (const file of hlsFiles) {
        const filePath = path.join(hlsDir, file);
        const objectKey = `videos/${videoId}/hls/${file}`;
        uploads.push(
          await this.uploadFile(filePath, objectKey, {
            videoId,
            type: 'hls',
          })
        );
      }
    } catch {
      // No HLS directory
    }

    return uploads;
  }

  async deleteFile(objectKey) {
    const filePath = path.join(this.rootDir, objectKey);
    try {
      await fs.unlink(filePath);
      console.log(`Deleted from local storage: ${objectKey}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return true;
      throw error;
    }
  }

  async deleteVideoFiles(videoId) {
    const prefixes = [`videos/${videoId}`, `thumbnails/${videoId}`];
    for (const prefix of prefixes) {
      const dir = path.join(this.rootDir, prefix);
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        // ignore missing dirs
      }
    }
    return true;
  }

  async getPresignedUrl(objectKey) {
    return path.join(this.rootDir, objectKey);
  }

  getCdnUrl(objectKey) {
    if (this.cdnUrl) return `${this.cdnUrl}/${objectKey}`;
    return path.join(this.rootDir, objectKey);
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.m3u8': 'application/x-mpegURL',
      '.ts': 'video/MP2T',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.mpd': 'application/dash+xml',
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  async ensureBucket() {
    await fs.mkdir(this.rootDir, { recursive: true });
    console.log(`Local storage ready at ${this.rootDir}`);
  }

  async configureCORS() {
    // No-op for local disk storage
  }

  async getBucketStats() {
    // Lightweight walk — fine for diagnostics
    let totalSize = 0;
    let fileCount = 0;

    async function walk(dir) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          const stats = await fs.stat(full);
          totalSize += stats.size;
          fileCount += 1;
        }
      }
    }

    await walk(this.rootDir);
    return {
      fileCount,
      totalSize,
      totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
      bucketName: this.rootDir,
    };
  }
}

module.exports = new LocalObjectStorage();
