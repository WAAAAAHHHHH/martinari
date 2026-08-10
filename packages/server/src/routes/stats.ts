import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTotalTransfers, incrementTotalTransfers } from '../services/statsService.js';

export async function statsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/stats
  fastify.get('/api/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ totalTransfers: getTotalTransfers() });
  });

  // POST /api/stats/increment
  fastify.post('/api/stats/increment', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ totalTransfers: incrementTotalTransfers() });
  });
}
