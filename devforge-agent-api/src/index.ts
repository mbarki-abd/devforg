import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from 'dotenv';
import pino from 'pino';

import { executeRoutes } from './routes/execute.js';
import { statusRoutes } from './routes/status.js';
import { healthRoutes } from './routes/health.js';
import { unixRoutes } from './routes/unix.js';
import { websocketHandler } from './routes/websocket.js';
import { RedisService } from './services/redis.js';
import { QueueService } from './services/queue.js';
import { createExecutorFactory } from './executors/index.js';

config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const fastify = Fastify({
  logger: true,
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });

    await fastify.register(helmet);

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    await fastify.register(websocket);

    // Initialize services
    const redis = new RedisService(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.connect();
    fastify.decorate('redis', redis);

    const queue = new QueueService(redis);
    queue.initialize(createExecutorFactory(redis));
    fastify.decorate('queue', queue);

    // Register routes
    await fastify.register(executeRoutes, { prefix: '/execute' });
    await fastify.register(statusRoutes, { prefix: '/status' });
    await fastify.register(healthRoutes, { prefix: '/health' });
    await fastify.register(unixRoutes, { prefix: '/unix' });
    await fastify.register(websocketHandler, { prefix: '/ws' });

    // Start server
    const port = parseInt(process.env.PORT || '8080', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    logger.info({ port, host }, 'DevForge Agent API started');

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info({ signal }, 'Shutdown signal received');
        await fastify.close();
        await redis.disconnect();
        process.exit(0);
      });
    }
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();

// Type declarations for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisService;
    queue: QueueService;
  }
}
