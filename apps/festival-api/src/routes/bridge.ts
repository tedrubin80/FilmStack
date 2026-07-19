/**
 * Bridge Routes — Cross-service communication endpoints
 *
 * These endpoints are called by the streaming-api to notify the
 * festival-api about submissions from the streaming platform.
 * They're internal service-to-service calls, not user-facing.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';

export const bridgeRouter = Router();

/**
 * GET /api/bridge/festivals/accepting
 * Public list of festivals accepting submissions (no auth — used by streaming-api)
 */
bridgeRouter.get('/festivals/accepting', async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const festivals = await prisma.festival.findMany({
      where: {
        isActive: true,
        OR: [{ submissionDeadline: null }, { submissionDeadline: { gt: now } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        submissionDeadline: true,
        entryFee: true,
        earlyBirdFee: true,
        earlyBirdDeadline: true,
        currency: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: festivals });
  } catch (error) {
    logger.error('Bridge festivals list error:', error);
    res.status(500).json({ error: 'Failed to fetch festivals' });
  }
});

/**
 * POST /api/bridge/submission-notify
 * Called by the streaming-api when a video is submitted to a festival.
 * Creates a Film record in the festival database if it doesn't exist.
 */
bridgeRouter.post('/submission-notify', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      submissionId,
      videoId,
      videoTitle,
      videoDuration,
      festivalId,
      submitterEmail,
      director,
    } = req.body;

    if (!festivalId || !videoTitle) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify festival exists
    const festival = await prisma.festival.findUnique({
      where: { id: parseInt(festivalId, 10) },
    });

    if (!festival) {
      res.status(404).json({ error: 'Festival not found' });
      return;
    }

    // Create a Film submission record in the festival database
    const film = await prisma.film.create({
      data: {
        tenantId: festival.tenantId,
        festivalId: festival.id,
        title: videoTitle,
        director: director || null,
        duration: videoDuration ? Math.round(videoDuration / 60) : null, // convert seconds to minutes
        contactEmail: submitterEmail,
        status: 'pending',
        notes: `Submitted from streaming platform. Video ID: ${videoId}. Bridge submission ID: ${submissionId}`,
      },
    });

    logger.info('Bridge submission created', {
      filmId: film.id,
      festivalId: festival.id,
      videoId,
      submissionId,
    });

    res.status(201).json({ success: true, filmId: film.id });
  } catch (error) {
    logger.error('Bridge submission error:', error);
    res.status(500).json({ error: 'Failed to process submission notification' });
  }
});

/**
 * GET /api/bridge/festival-awards/:videoId
 * Returns any awards a streaming video has received from festivals.
 * Called by the streaming platform to show award badges.
 */
bridgeRouter.get('/festival-awards/:videoId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;

    // Find films that were submitted from this video ID
    const films = await prisma.film.findMany({
      where: {
        notes: { contains: `Video ID: ${videoId}` },
      },
      include: {
        awards: {
          include: { festival: { select: { name: true, location: true } } },
        },
      },
    });

    const awards = films.flatMap((film) =>
      film.awards.map((award) => ({
        awardName: award.awardName,
        category: award.category,
        year: award.year,
        recipientName: award.recipientName,
        festivalName: award.festival.name,
        festivalLocation: award.festival.location,
      })),
    );

    res.json({ success: true, data: awards });
  } catch (error) {
    logger.error('Bridge awards lookup error:', error);
    res.json({ success: true, data: [] });
  }
});
