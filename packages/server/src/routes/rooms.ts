import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { isValidRoomCode } from '../utils/generateCode.js';
import {
  createRoom,
  roomExists,
  getRoomPeerCount,
  checkRateLimit,
} from '../services/roomService.js';

export async function roomRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/rooms — create a new room
  fastify.post('/api/rooms', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip ?? 'unknown';

    if (!checkRateLimit(ip)) {
      return reply.status(429).send({
        error: 'RATE_LIMITED',
        message: 'Too many rooms created. Please wait a minute.',
      });
    }

    const { code } = createRoom();

    return reply.status(201).send({ code });
  });

  // GET /api/rooms/:code — check if a room exists
  fastify.get(
    '/api/rooms/:code',
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;
      const upperCode = code.toUpperCase();

      if (!isValidRoomCode(upperCode)) {
        return reply.status(400).send({
          error: 'INVALID_CODE',
          message: 'Room code must be 6 alphanumeric characters.',
        });
      }

      const exists = roomExists(upperCode);
      const peerCount = exists ? getRoomPeerCount(upperCode) : 0;

      return reply.send({ exists, peerCount, code: upperCode });
    }
  );

  // GET /api/health — server health check
  fastify.get('/api/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: Date.now() });
  });
}
