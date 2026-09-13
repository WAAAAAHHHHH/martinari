import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRoom, roomExists, getRoomPeerCount, getRoom } from '../services/roomService.js';

const VALID_API_KEYS = new Set([
  process.env.ADMIN_API_KEY || 'martinari-dev-key-123'
]);

export async function v1Routes(fastify: FastifyInstance): Promise<void> {
  
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!VALID_API_KEYS.has(token)) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Invalid API key.' });
    }
  });

  fastify.post('/rooms', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { password?: string, type?: 'normal' | 'broadcast' } | undefined;
    const password = body?.password;
    const type = body?.type === 'broadcast' ? 'broadcast' : 'normal';

    const { code, room } = createRoom(password, type);

    return reply.status(201).send({ 
      code, 
      creatorToken: room.creatorToken,
      url: `https://martinari.com/room/${code}`
    });
  });

  fastify.get('/rooms/:code', async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
    const { code } = request.params;
    const upperCode = code.toUpperCase();

    const exists = roomExists(upperCode);
    if (!exists) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Room not found.' });
    }

    const room = getRoom(upperCode);
    const peerCount = getRoomPeerCount(upperCode);

    return reply.send({
      code: upperCode,
      exists: true,
      peerCount,
      type: room?.type || 'normal',
      isPasswordProtected: !!room?.password,
      createdAt: room?.createdAt
    });
  });
}
