import { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { WsEvent } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'websocket' });

interface WsClient {
  ws: WebSocket;
  executionId: string;
  userId?: string;
}

export async function websocketHandler(fastify: FastifyInstance): Promise<void> {
  const clients = new Map<string, Set<WsClient>>();

  // Subscribe to Redis for execution events
  await fastify.redis.subscribe('execution:*', (message: unknown) => {
    const event = message as WsEvent;
    broadcastToExecution(event.executionId, event);
  });

  function broadcastToExecution(executionId: string, event: WsEvent): void {
    const executionClients = clients.get(executionId);
    if (!executionClients) return;

    const data = JSON.stringify(event);
    for (const client of executionClients) {
      if (client.ws.readyState === 1) { // OPEN
        client.ws.send(data);
      }
    }
  }

  fastify.get('/', { websocket: true }, (socket, request) => {
    const ws = socket;
    let currentExecutionId: string | null = null;

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.executionId) {
          // Unsubscribe from previous execution
          if (currentExecutionId) {
            const oldClients = clients.get(currentExecutionId);
            if (oldClients) {
              for (const client of oldClients) {
                if (client.ws === ws) {
                  oldClients.delete(client);
                  break;
                }
              }
            }
          }

          // Subscribe to new execution
          currentExecutionId = data.executionId as string;
          if (!clients.has(currentExecutionId)) {
            clients.set(currentExecutionId, new Set());
          }
          const clientSet = clients.get(currentExecutionId);
          if (clientSet) {
            clientSet.add({
              ws,
              executionId: currentExecutionId,
              userId: data.userId,
            });
          }

          ws.send(JSON.stringify({
            type: 'subscribed',
            executionId: currentExecutionId,
            timestamp: Date.now(),
          }));

          logger.info({ executionId: currentExecutionId }, 'Client subscribed');
        }

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        logger.error({ error }, 'Failed to parse WebSocket message');
      }
    });

    ws.on('close', () => {
      if (currentExecutionId) {
        const executionClients = clients.get(currentExecutionId);
        if (executionClients) {
          for (const client of executionClients) {
            if (client.ws === ws) {
              executionClients.delete(client);
              break;
            }
          }
          if (executionClients.size === 0) {
            clients.delete(currentExecutionId);
          }
        }
        logger.info({ executionId: currentExecutionId }, 'Client disconnected');
      }
    });

    ws.on('error', (error) => {
      logger.error({ error, executionId: currentExecutionId }, 'WebSocket error');
    });
  });
}
