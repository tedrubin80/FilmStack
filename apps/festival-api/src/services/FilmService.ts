import { Film, FilmFile } from '@prisma/client';
import fs from 'fs/promises';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import { fileStorage } from './FileStorageService';

interface FilmSubmissionData {
  title: string;
  director?: string;
  producer?: string;
  writer?: string;
  duration?: number;
  year?: number;
  country?: string;
  language?: string;
  subtitles?: string;
  genre?: string;
  synopsis?: string;
  screeningFormat?: string;
  aspectRatio?: string;
  soundFormat?: string;
  premiereStatus?: string;
  studentFilm?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

export class FilmService {
  private prisma = prisma;

  constructor() {
    // Removed PrismaClient initialization - using shared instance
  }

  async submitFilm(
    tenantId: number,
    festivalId: number,
    filmData: FilmSubmissionData,
    files?: UploadedFile[]
  ): Promise<Film> {
    try {
      // Validate festival exists and belongs to tenant
      const festival = await this.prisma.festival.findFirst({
        where: {
          id: festivalId,
          tenantId: tenantId,
          isActive: true,
        },
      });

      if (!festival) {
        throw new Error('Festival not found or inactive');
      }

      // Check submission deadline
      if (festival.submissionDeadline && new Date() > festival.submissionDeadline) {
        throw new Error('Submission deadline has passed');
      }

      // Create film submission
      const film = await this.prisma.film.create({
        data: {
          tenantId,
          festivalId,
          title: filmData.title,
          director: filmData.director,
          producer: filmData.producer,
          writer: filmData.writer,
          duration: filmData.duration,
          year: filmData.year,
          country: filmData.country,
          language: filmData.language,
          subtitles: filmData.subtitles,
          genre: filmData.genre,
          synopsis: filmData.synopsis,
          screeningFormat: filmData.screeningFormat,
          aspectRatio: filmData.aspectRatio,
          soundFormat: filmData.soundFormat,
          premiereStatus: filmData.premiereStatus,
          studentFilm: filmData.studentFilm || false,
          contactName: filmData.contactName,
          contactEmail: filmData.contactEmail,
          contactPhone: filmData.contactPhone,
          notes: filmData.notes,
          status: 'pending',
        },
      });

      // Handle file uploads
      if (files && files.length > 0) {
        await this.saveFilmFiles(film.id, files);
      }

      logger.info(`Film submitted successfully: ${film.id} - ${film.title}`);
      return film;
    } catch (error) {
      logger.error('Error submitting film:', error);
      throw error;
    }
  }

  async saveFilmFiles(filmId: number, files: UploadedFile[]): Promise<FilmFile[]> {
    const savedFiles: FilmFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Skip if file is undefined
      if (!file) {
        continue;
      }

      try {
        // Determine file type based on mimetype
        let fileType = 'other';
        if (file.mimetype.startsWith('video/')) {
          fileType = 'film';
        } else if (file.mimetype.startsWith('image/')) {
          fileType = 'poster';
        } else if (file.mimetype.includes('pdf')) {
          fileType = 'script';
        }

        // Generate storage key with film folder prefix
        const storageKey = fileStorage.generateKey(
          file.originalname,
          `films/${filmId}/`
        );

        // Upload to storage (S3 or local)
        const uploadResult = await fileStorage.uploadFile(
          file.path,
          storageKey,
          file.mimetype
        );

        // Clean up temp file after successful upload
        try {
          await fs.unlink(file.path);
        } catch {
          logger.warn(`Could not delete temp file: ${file.path}`);
        }

        // Save file record to database
        const filmFile = await this.prisma.filmFile.create({
          data: {
            filmId,
            fileType,
            fileName: file.originalname,
            filePath: uploadResult.key, // Store the storage key, not full path
            fileSize: file.size,
            mimeType: file.mimetype,
            isPrimary: i === 0 && fileType === 'film',
          },
        });

        savedFiles.push(filmFile);
        logger.info(
          `Saved film file: ${filmFile.fileName} to ${uploadResult.provider} for film ${filmId}`
        );
      } catch (error) {
        logger.error(`Error saving file ${file.originalname}:`, error);
        // Clean up temp file on error
        try {
          await fs.unlink(file.path);
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return savedFiles;
  }

  async getFilmsByFestival(
    tenantId: number,
    festivalId: number,
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ films: Film[]; total: number; hasMore: boolean }> {
    try {
      const where = {
        tenantId,
        festivalId,
        ...(status && { status }),
      };

      const [films, total] = await Promise.all([
        this.prisma.film.findMany({
          where,
          include: {
            filmFiles: true,
            awards: true,
            judgeScores: {
              include: {
                judge: true,
              },
            },
          },
          orderBy: { submissionDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.film.count({ where }),
      ]);

      const hasMore = page * limit < total;

      return { films, total, hasMore };
    } catch (error) {
      logger.error('Error fetching films by festival:', error);
      throw error;
    }
  }

  async getFilmById(tenantId: number, filmId: number): Promise<Film | null> {
    try {
      return await this.prisma.film.findFirst({
        where: {
          id: filmId,
          tenantId,
        },
        include: {
          festival: true,
          filmFiles: true,
          awards: true,
          judgeScores: {
            include: {
              judge: true,
            },
          },
          payments: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching film by ID:', error);
      throw error;
    }
  }

  async updateFilmStatus(
    tenantId: number,
    filmId: number,
    status: string,
    notes?: string
  ): Promise<Film> {
    try {
      const film = await this.prisma.film.update({
        where: {
          id: filmId,
          tenantId,
        },
        data: {
          status,
          ...(notes && { notes }),
        },
      });

      logger.info(`Film status updated: ${filmId} -> ${status}`);
      return film;
    } catch (error) {
      logger.error('Error updating film status:', error);
      throw error;
    }
  }

  async deleteFilm(tenantId: number, filmId: number): Promise<void> {
    try {
      // Get film files to delete from storage
      const filmFiles = await this.prisma.filmFile.findMany({
        where: { filmId },
      });

      // Delete files from storage (S3 or local)
      for (const file of filmFiles) {
        try {
          if (file.filePath) {
            await fileStorage.deleteFile(file.filePath);
          }
        } catch (error) {
          logger.warn(`Could not delete file: ${file.filePath}`, error);
        }
      }

      // Delete film record (cascading deletes will handle filmFiles)
      await this.prisma.film.delete({
        where: {
          id: filmId,
          tenantId,
        },
      });

      logger.info(`Film deleted: ${filmId}`);
    } catch (error) {
      logger.error('Error deleting film:', error);
      throw error;
    }
  }

  async getFilmStatistics(tenantId: number, festivalId: number) {
    try {
      const [
        totalSubmissions,
        pendingSubmissions,
        acceptedSubmissions,
        rejectedSubmissions,
        paidSubmissions,
      ] = await Promise.all([
        this.prisma.film.count({
          where: { tenantId, festivalId },
        }),
        this.prisma.film.count({
          where: { tenantId, festivalId, status: 'pending' },
        }),
        this.prisma.film.count({
          where: { tenantId, festivalId, status: 'accepted' },
        }),
        this.prisma.film.count({
          where: { tenantId, festivalId, status: 'rejected' },
        }),
        this.prisma.film.count({
          where: { tenantId, festivalId, entryFeePaid: true },
        }),
      ]);

      return {
        totalSubmissions,
        pendingSubmissions,
        acceptedSubmissions,
        rejectedSubmissions,
        paidSubmissions,
        paymentRate: totalSubmissions > 0 ? (paidSubmissions / totalSubmissions) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting film statistics:', error);
      throw error;
    }
  }

  async getFileDownloadUrl(tenantId: number, fileId: number): Promise<string> {
    try {
      const file = await this.prisma.filmFile.findFirst({
        where: {
          id: fileId,
          film: {
            tenantId,
          },
        },
      });

      if (!file || !file.filePath) {
        throw new Error('File not found');
      }

      // Get download URL (signed URL for S3, file path for local)
      return await fileStorage.getDownloadUrl(file.filePath, 3600); // 1 hour expiry
    } catch (error) {
      logger.error('Error getting file download URL:', error);
      throw error;
    }
  }
}

export default new FilmService();
