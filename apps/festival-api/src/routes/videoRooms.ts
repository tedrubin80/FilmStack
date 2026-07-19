import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import { prisma } from '@filmstack/shared-db';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../middleware/auth';
import { parseIntParam } from '../types/express';

export const videoRoomsRouter = express.Router();

function generateRoomId(): string {
  return `room_${crypto.randomBytes(8).toString('hex')}`;
}

// GET /api/video-rooms - List all video rooms
videoRoomsRouter.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(['active', 'inactive', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const where: any = { tenantId: req.user.tenantId };
      if (status && status !== 'all') {
        where.isActive = status === 'active';
      }

      const [rooms, total] = await Promise.all([
        prisma.videoRoom.findMany({
          where,
          include: {
            creator: { select: { id: true, username: true, firstName: true, lastName: true } },
            _count: { select: { roomParticipants: true, roomChatMessages: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.videoRoom.count({ where })
      ]);

      res.json({
        success: true,
        data: { rooms, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
      });
    } catch (error) {
      logger.error('List video rooms error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /api/video-rooms/:id - Get room details
videoRoomsRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId },
      include: {
        creator: { select: { id: true, username: true, firstName: true, lastName: true } },
        roomParticipants: {
          where: { isActive: true },
          include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } }
        },
        _count: { select: { roomChatMessages: true, roomRecordings: true } }
      }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    res.json({ success: true, data: { room } });
  } catch (error) {
    logger.error('Get video room error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/video-rooms - Create a new room
videoRoomsRouter.post(
  '/',
  authenticate,
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('maxParticipants').optional().isInt({ min: 2, max: 50 }),
    body('settings').optional().isObject()
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, maxParticipants = 10, settings = {} } = req.body;

      const activeRoomsCount = await prisma.videoRoom.count({
        where: { tenantId: req.user.tenantId, isActive: true }
      });

      if (activeRoomsCount >= 20) {
        res.status(400).json({ error: 'Active room limit reached' });
        return;
      }

      const room = await prisma.videoRoom.create({
        data: {
          tenantId: req.user.tenantId,
          roomId: generateRoomId(),
          name,
          createdBy: req.user.userId,
          maxParticipants,
          settings: JSON.stringify(settings),
          startedAt: new Date()
        },
        include: { creator: { select: { id: true, username: true, firstName: true, lastName: true } } }
      });

      await prisma.roomActivityLog.create({
        data: { roomId: room.id, userId: req.user.userId, action: 'room_created' }
      });

      res.status(201).json({ success: true, data: { room } });
    } catch (error) {
      logger.error('Create video room error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// POST /api/video-rooms/:id/join
videoRoomsRouter.post('/:id/join', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId, isActive: true },
      include: { _count: { select: { roomParticipants: { where: { isActive: true } } } } }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    if (room._count.roomParticipants >= room.maxParticipants) {
      res.status(400).json({ error: 'Room is full' });
      return;
    }

    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: { roomId: room.id, userId: req.user.userId, isActive: true }
    });

    if (existingParticipant) {
      res.json({ success: true, message: 'Already in room', data: { participant: existingParticipant } });
      return;
    }

    const peerId = `peer_${crypto.randomBytes(8).toString('hex')}`;
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: req.user.userId,
        peerId,
        role: room.createdBy === req.user.userId ? 'host' : 'participant'
      }
    });

    await prisma.roomActivityLog.create({
      data: { roomId: room.id, userId: req.user.userId, action: 'participant_joined' }
    });

    res.json({ success: true, data: { participant, room: { id: room.id, roomId: room.roomId, name: room.name } } });
  } catch (error) {
    logger.error('Join video room error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/video-rooms/:id/leave
videoRoomsRouter.post('/:id/leave', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    const result = await prisma.roomParticipant.updateMany({
      where: { roomId: room.id, userId: req.user.userId, isActive: true },
      data: { isActive: false, leftAt: new Date() }
    });

    if (result.count === 0) {
      res.status(400).json({ error: 'Not currently in this room' });
      return;
    }

    await prisma.roomActivityLog.create({
      data: { roomId: room.id, userId: req.user.userId, action: 'participant_left' }
    });

    res.json({ success: true, message: 'Left room successfully' });
  } catch (error) {
    logger.error('Leave video room error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/video-rooms/:id/end
videoRoomsRouter.post('/:id/end', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId, isActive: true }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    if (room.createdBy !== req.user.userId) {
      res.status(403).json({ error: 'Only the room creator can end the room' });
      return;
    }

    await prisma.$transaction([
      prisma.videoRoom.update({ where: { id: room.id }, data: { isActive: false, endedAt: new Date() } }),
      prisma.roomParticipant.updateMany({
        where: { roomId: room.id, isActive: true },
        data: { isActive: false, leftAt: new Date() }
      })
    ]);

    await prisma.roomActivityLog.create({
      data: { roomId: room.id, userId: req.user.userId, action: 'room_ended' }
    });

    res.json({ success: true, message: 'Room ended successfully' });
  } catch (error) {
    logger.error('End video room error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/video-rooms/:id/chat
videoRoomsRouter.post(
  '/:id/chat',
  authenticate,
  [body('message').trim().isLength({ min: 1, max: 1000 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const roomId = parseIntParam(req.params.id, 'id');

      const participant = await prisma.roomParticipant.findFirst({
        where: {
          room: { id: roomId, tenantId: req.user.tenantId, isActive: true },
          userId: req.user.userId,
          isActive: true
        }
      });

      if (!participant) {
        res.status(403).json({ error: 'You must join the room to send messages' });
        return;
      }

      const chatMessage = await prisma.roomChatMessage.create({
        data: { roomId: participant.roomId, userId: req.user.userId, message: req.body.message },
        include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } }
      });

      res.status(201).json({ success: true, data: { message: chatMessage } });
    } catch (error) {
      logger.error('Send chat message error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /api/video-rooms/:id/chat
videoRoomsRouter.get('/:id/chat', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    const messages = await prisma.roomChatMessage.findMany({
      where: { roomId: room.id },
      include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } },
      orderBy: { sentAt: 'desc' },
      take: limit
    });

    res.json({ success: true, data: { messages: messages.reverse() } });
  } catch (error) {
    logger.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/video-rooms/:id/participants
videoRoomsRouter.get('/:id/participants', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id, isActive: true },
      include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });

    res.json({ success: true, data: { participants } });
  } catch (error) {
    logger.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/video-rooms/:id
videoRoomsRouter.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('maxParticipants').optional().isInt({ min: 2, max: 50 }),
    body('settings').optional().isObject()
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const roomId = parseIntParam(req.params.id, 'id');

      const room = await prisma.videoRoom.findFirst({
        where: { id: roomId, tenantId: req.user.tenantId }
      });

      if (!room) {
        res.status(404).json({ error: 'Video room not found' });
        return;
      }

      if (room.createdBy !== req.user.userId) {
        res.status(403).json({ error: 'Only the room creator can update settings' });
        return;
      }

      const { name, maxParticipants, settings } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
      if (settings !== undefined) updateData.settings = JSON.stringify(settings);

      const updatedRoom = await prisma.videoRoom.update({
        where: { id: room.id },
        data: updateData,
        include: { creator: { select: { id: true, username: true, firstName: true, lastName: true } } }
      });

      res.json({ success: true, data: { room: updatedRoom } });
    } catch (error) {
      logger.error('Update video room error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// DELETE /api/video-rooms/:id
videoRoomsRouter.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roomId = parseIntParam(req.params.id, 'id');

    const room = await prisma.videoRoom.findFirst({
      where: { id: roomId, tenantId: req.user.tenantId }
    });

    if (!room) {
      res.status(404).json({ error: 'Video room not found' });
      return;
    }

    if (room.isActive) {
      res.status(400).json({ error: 'Cannot delete an active room. End the room first.' });
      return;
    }

    if (room.createdBy !== req.user.userId) {
      res.status(403).json({ error: 'Only the room creator can delete the room' });
      return;
    }

    await prisma.videoRoom.delete({ where: { id: room.id } });

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    logger.error('Delete video room error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
