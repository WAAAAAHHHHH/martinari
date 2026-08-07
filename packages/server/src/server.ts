import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyWebSocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomRoutes } from './routes/rooms.js';
import { signalingRoutes } from './routes/signaling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

async function buildApp() {
  const fastify = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: { colorize: true },
            },
    },
    trustProxy: true,
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await fastify.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://martinari.com', 'https://www.martinari.com']
      : true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await fastify.register(fastifyWebSocket, {
    options: {
      maxPayload: 65536, // 64KB max WS message — only signaling messages, never file data
    },
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(roomRoutes);
  await fastify.register(signalingRoutes);

  // Serve static files from the client's dist folder
  const clientDist = path.join(__dirname, '../../../client/dist');
  await fastify.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });

  // SPA Fallback: Any other GET request returns index.html
  fastify.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api')) {
      reply.sendFile('index.html');
    } else {
      reply.status(404).send({ error: 'Not Found' });
    }
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
  });

  return fastify;
}

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Martinari server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
