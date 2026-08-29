import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { isValidRoomCode } from '../utils/generateCode.js';
import {
  createRoom,
  roomExists,
  getRoomPeerCount,
  checkRateLimit,
  getRoom,
} from '../services/roomService.js';

export async function roomRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/rooms — create a new room
  fastify.post('/api/rooms', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip ?? 'unknown';
    const body = request.body as { password?: string, type?: 'normal' | 'broadcast', isPrivate?: boolean, instaDownload?: boolean } | undefined;
    const password = body?.password;
    const type = body?.type === 'broadcast' ? 'broadcast' : 'normal';
    const isPrivate = body?.isPrivate === true;
    const instaDownload = body?.instaDownload === true;

    if (!checkRateLimit(ip)) {
      return reply.status(429).send({
        error: 'RATE_LIMITED',
        message: 'Too many rooms created. Please wait a minute.',
      });
    }

    const { code, room } = createRoom(password, type, isPrivate, instaDownload);

    return reply.status(201).send({ 
      code, 
      creatorToken: room.creatorToken,
      privateKey: room.privateKey 
    });
  });

  // GET /api/rooms/:code — check if a room exists
  fastify.get(
    '/api/rooms/:code',
    async (
      request: FastifyRequest<{ Params: { code: string }, Querystring: { key?: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;
      const { key } = request.query;
      const upperCode = code.toUpperCase();

      if (!isValidRoomCode(upperCode)) {
        return reply.status(400).send({
          error: 'INVALID_CODE',
          message: 'Room code must be 6 alphanumeric characters.',
        });
      }

      const exists = roomExists(upperCode);
      const peerCount = exists ? getRoomPeerCount(upperCode) : 0;
      
      const room = getRoom(upperCode);

      if (room?.isPrivate && room.privateKey !== key) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'This is a private room. You need the exact link with the secure key to join.',
        });
      }

      const isPasswordProtected = !!room?.password;
      const type = room?.type || 'normal';
      const instaDownload = !!room?.instaDownload;
      const isPrivate = !!room?.isPrivate;

      return reply.send({ exists, peerCount, code: upperCode, isPasswordProtected, type, instaDownload, isPrivate });
    }
  );

  // GET /api/health — server health check
  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: Date.now() });
  });
}
