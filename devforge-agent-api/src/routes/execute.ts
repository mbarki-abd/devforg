import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middlewares/auth.js';
import {
  ExecuteRequestSchema,
  ClaudeParamsSchema,
  AzureParamsSchema,
  GCloudParamsSchema,
  SSHParamsSchema,
  DockerParamsSchema,
  ShellParamsSchema,
  type AgentType,
} from '../types/index.js';
import { z } from 'zod';

const agentParamSchemas: Record<AgentType, z.ZodSchema> = {
  claude: ClaudeParamsSchema,
  azure: AzureParamsSchema,
  gcloud: GCloudParamsSchema,
  ssh: SSHParamsSchema,
  docker: DockerParamsSchema,
  shell: ShellParamsSchema,
};

export async function executeRoutes(fastify: FastifyInstance): Promise<void> {
  // Add auth middleware to all routes
  fastify.addHook('preHandler', authMiddleware);

  // Generic execute endpoint
  fastify.post<{
    Params: { agent: AgentType };
    Body: unknown;
  }>('/:agent', async (request, reply) => {
    const { agent } = request.params;

    // Validate agent type
    const validAgents: AgentType[] = ['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell'];
    if (!validAgents.includes(agent)) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_AGENT', message: `Invalid agent type: ${agent}` },
      });
    }

    try {
      // Parse and validate request
      const executeRequest = ExecuteRequestSchema.parse(request.body);
      const { payload } = executeRequest;

      // Validate agent-specific parameters
      const paramSchema = agentParamSchemas[agent];
      paramSchema.parse(payload.parameters);

      // Add to execution queue
      const jobId = await fastify.queue.add(agent, {
        executionId: payload.executionId,
        agentType: agent,
        parameters: payload.parameters,
        credentials: payload.credentials,
        unixUser: payload.unixUser,
        userId: payload.userId,
      });

      // Store initial execution state
      await fastify.redis.setExecutionState(payload.executionId, {
        status: 'queued',
        agentType: agent,
        jobId,
        startedAt: Date.now(),
        userId: payload.userId,
      });

      return reply.code(202).send({
        requestId: executeRequest.requestId,
        success: true,
        data: {
          executionId: payload.executionId,
          jobId,
          status: 'queued',
          wsChannel: `execution:${payload.executionId}`,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          },
        });
      }
      throw error;
    }
  });

  // Cancel execution
  fastify.post<{
    Body: { executionId: string };
  }>('/cancel', async (request, reply) => {
    const { executionId } = request.body;

    const state = await fastify.redis.getExecutionState(executionId);
    if (!state) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Execution not found' },
      });
    }

    // Update state to cancelled
    await fastify.redis.setExecutionState(executionId, {
      ...state,
      status: 'cancelled',
      cancelledAt: Date.now(),
    });

    // Publish cancel event
    await fastify.redis.publish(`execution:${executionId}`, {
      type: 'cancelled',
      executionId,
      timestamp: Date.now(),
    });

    return reply.send({
      success: true,
      data: { executionId, status: 'cancelled' },
    });
  });

  // Get execution status
  fastify.get<{
    Params: { executionId: string };
  }>('/:executionId/status', async (request, reply) => {
    const { executionId } = request.params;

    const state = await fastify.redis.getExecutionState(executionId);
    if (!state) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Execution not found' },
      });
    }

    return reply.send({
      success: true,
      data: state,
    });
  });
}
