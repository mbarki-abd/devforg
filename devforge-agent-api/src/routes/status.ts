import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.js';
import type { AgentType } from '../types/index.js';

export async function statusRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware);

  // Get all agents status
  fastify.get('/', async (request, reply) => {
    const agentTypes: AgentType[] = ['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell'];
    const statuses: Record<string, unknown> = {};

    for (const agentType of agentTypes) {
      const queueStatus = await fastify.queue.getQueueStatus(agentType);
      statuses[agentType] = {
        available: true,
        queue: queueStatus,
      };
    }

    return reply.send({
      success: true,
      data: {
        agents: statuses,
        redis: { connected: fastify.redis.connected },
        timestamp: Date.now(),
      },
    });
  });

  // Get specific agent status
  fastify.get<{
    Params: { agent: AgentType };
  }>('/:agent', async (request, reply) => {
    const { agent } = request.params;
    const validAgents: AgentType[] = ['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell'];

    if (!validAgents.includes(agent)) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_AGENT', message: `Invalid agent type: ${agent}` },
      });
    }

    const queueStatus = await fastify.queue.getQueueStatus(agent);

    return reply.send({
      success: true,
      data: {
        agent,
        available: true,
        queue: queueStatus,
        timestamp: Date.now(),
      },
    });
  });
}
