import { Judge, JudgeScore } from '@prisma/client';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';

interface JudgeData {
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  expertise?: string;
}

interface JudgeScoreData {
  criteria: string;
  score: number;
  maxScore?: number;
  feedback?: string;
}

export class JudgeService {
  private prisma = prisma;

  constructor() {
    // Removed PrismaClient initialization - using shared instance
  }

  async createJudge(tenantId: number, festivalId: number, judgeData: JudgeData): Promise<Judge> {
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

      // Check if judge already exists for this festival
      const existingJudge = await this.prisma.judge.findFirst({
        where: {
          tenantId,
          festivalId,
          email: judgeData.email,
        },
      });

      if (existingJudge) {
        throw new Error('Judge with this email already exists for this festival');
      }

      const judge = await this.prisma.judge.create({
        data: {
          tenantId,
          festivalId,
          email: judgeData.email,
          firstName: judgeData.firstName,
          lastName: judgeData.lastName,
          bio: judgeData.bio,
          expertise: judgeData.expertise,
        },
      });

      logger.info(`Judge created: ${judge.id} - ${judge.email}`);
      return judge;
    } catch (error) {
      logger.error('Error creating judge:', error);
      throw error;
    }
  }

  async getJudgesByFestival(tenantId: number, festivalId: number): Promise<Judge[]> {
    try {
      return await this.prisma.judge.findMany({
        where: {
          tenantId,
          festivalId,
          isActive: true,
        },
        include: {
          judgeScores: {
            include: {
              film: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching judges by festival:', error);
      throw error;
    }
  }

  async submitScore(
    tenantId: number,
    judgeId: number,
    filmId: number,
    scoreData: JudgeScoreData
  ): Promise<JudgeScore> {
    try {
      // Validate judge belongs to tenant
      const judge = await this.prisma.judge.findFirst({
        where: {
          id: judgeId,
          tenantId,
          isActive: true,
        },
      });

      if (!judge) {
        throw new Error('Judge not found or inactive');
      }

      // Validate film belongs to same festival as judge
      const film = await this.prisma.film.findFirst({
        where: {
          id: filmId,
          tenantId,
          festivalId: judge.festivalId,
        },
      });

      if (!film) {
        throw new Error('Film not found or not in the same festival');
      }

      // Validate score range
      const maxScore = scoreData.maxScore || 10;
      if (scoreData.score < 0 || scoreData.score > maxScore) {
        throw new Error(`Score must be between 0 and ${maxScore}`);
      }

      // Create or update score
      const score = await this.prisma.judgeScore.upsert({
        where: {
          judgeId_filmId_criteria: {
            judgeId,
            filmId,
            criteria: scoreData.criteria,
          },
        },
        update: {
          score: scoreData.score,
          maxScore,
          feedback: scoreData.feedback,
        },
        create: {
          judgeId,
          filmId,
          criteria: scoreData.criteria,
          score: scoreData.score,
          maxScore,
          feedback: scoreData.feedback,
        },
      });

      logger.info(
        `Score submitted: Judge ${judgeId}, Film ${filmId}, Criteria: ${scoreData.criteria}`
      );
      return score;
    } catch (error) {
      logger.error('Error submitting score:', error);
      throw error;
    }
  }

  async getFilmScores(tenantId: number, filmId: number): Promise<JudgeScore[]> {
    try {
      return await this.prisma.judgeScore.findMany({
        where: {
          filmId,
          judge: {
            tenantId,
          },
        },
        include: {
          judge: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching film scores:', error);
      throw error;
    }
  }

  async getJudgeScores(tenantId: number, judgeId: number): Promise<JudgeScore[]> {
    try {
      return await this.prisma.judgeScore.findMany({
        where: {
          judgeId,
          judge: {
            tenantId,
          },
        },
        include: {
          film: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error fetching judge scores:', error);
      throw error;
    }
  }

  async getFilmAverageScores(tenantId: number, festivalId: number): Promise<any[]> {
    try {
      // Get all films with their average scores
      const filmsWithScores = await this.prisma.film.findMany({
        where: {
          tenantId,
          festivalId,
        },
        include: {
          judgeScores: {
            include: {
              judge: true,
            },
          },
        },
      });

      return filmsWithScores.map((film) => {
        const scoresByCriteria: {
          [key: string]: { total: number; count: number; maxScore: number };
        } = {};

        film.judgeScores.forEach((score) => {
          if (!scoresByCriteria[score.criteria]) {
            scoresByCriteria[score.criteria] = { total: 0, count: 0, maxScore: score.maxScore };
          }
          scoresByCriteria[score.criteria]!.total += score.score;
          scoresByCriteria[score.criteria]!.count += 1;
        });

        const averageScores = Object.entries(scoresByCriteria).map(([criteria, data]) => ({
          criteria,
          averageScore: data.count > 0 ? data.total / data.count : 0,
          maxScore: data.maxScore,
          judgeCount: data.count,
        }));

        const overallAverage =
          averageScores.length > 0
            ? averageScores.reduce((sum, score) => sum + score.averageScore, 0) /
              averageScores.length
            : 0;

        return {
          film: {
            id: film.id,
            title: film.title,
            director: film.director,
            status: film.status,
          },
          averageScores,
          overallAverage,
          totalJudges:
            film.judgeScores.length > 0
              ? [...new Set(film.judgeScores.map((s) => s.judgeId))].length
              : 0,
        };
      });
    } catch (error) {
      logger.error('Error calculating average scores:', error);
      throw error;
    }
  }

  async updateJudge(
    tenantId: number,
    judgeId: number,
    updateData: Partial<JudgeData>
  ): Promise<Judge> {
    try {
      const judge = await this.prisma.judge.update({
        where: {
          id: judgeId,
          tenantId,
        },
        data: {
          ...updateData,
        },
      });

      logger.info(`Judge updated: ${judgeId}`);
      return judge;
    } catch (error) {
      logger.error('Error updating judge:', error);
      throw error;
    }
  }

  async deactivateJudge(tenantId: number, judgeId: number): Promise<Judge> {
    try {
      const judge = await this.prisma.judge.update({
        where: {
          id: judgeId,
          tenantId,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Judge deactivated: ${judgeId}`);
      return judge;
    } catch (error) {
      logger.error('Error deactivating judge:', error);
      throw error;
    }
  }

  async getJudgingStatistics(tenantId: number, festivalId: number) {
    try {
      const [totalJudges, activeJudges, totalFilms, scoredFilms, totalScores] = await Promise.all([
        this.prisma.judge.count({
          where: { tenantId, festivalId },
        }),
        this.prisma.judge.count({
          where: { tenantId, festivalId, isActive: true },
        }),
        this.prisma.film.count({
          where: { tenantId, festivalId },
        }),
        this.prisma.film.count({
          where: {
            tenantId,
            festivalId,
            judgeScores: {
              some: {},
            },
          },
        }),
        this.prisma.judgeScore.count({
          where: {
            judge: {
              tenantId,
              festivalId,
            },
          },
        }),
      ]);

      const judgingProgress = totalFilms > 0 ? (scoredFilms / totalFilms) * 100 : 0;
      const averageScoresPerFilm = totalFilms > 0 ? totalScores / totalFilms : 0;

      return {
        totalJudges,
        activeJudges,
        totalFilms,
        scoredFilms,
        totalScores,
        judgingProgress,
        averageScoresPerFilm,
      };
    } catch (error) {
      logger.error('Error getting judging statistics:', error);
      throw error;
    }
  }
}

export default new JudgeService();
