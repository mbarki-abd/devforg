import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth.js';
import { UnixManager } from '../services/unix-manager.js';
import { CreateUnixAccountSchema, SudoGrantSchema } from '../types/index.js';
import { z } from 'zod';

export async function unixRoutes(fastify: FastifyInstance): Promise<void> {
  const unixManager = new UnixManager();

  fastify.addHook('preHandler', authMiddleware);

  // Create Unix account
  fastify.post('/create', async (request, reply) => {
    try {
      const { userId, username } = CreateUnixAccountSchema.parse(request.body);

      // Check if account already exists
      const existing = await fastify.redis.getUnixAccount(userId);
      if (existing) {
        return reply.code(409).send({
          success: false,
          error: { code: 'ALREADY_EXISTS', message: 'Unix account already exists for this user' },
        });
      }

      // Create the account
      const account = await unixManager.createAccount(username);

      // Store in Redis
      await fastify.redis.setUnixAccount(userId, account);

      return reply.code(201).send({
        success: true,
        data: account,
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

  // Grant/revoke sudo
  fastify.post('/sudo', async (request, reply) => {
    try {
      const { userId, username, commands, grant } = SudoGrantSchema.parse(request.body);

      // Check if account exists
      const existing = await fastify.redis.getUnixAccount(userId);
      if (!existing) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Unix account not found' },
        });
      }

      if (grant) {
        await unixManager.grantSudo(username, commands);
      } else {
        await unixManager.revokeSudo(username);
      }

      // Update Redis
      await fastify.redis.setUnixAccount(userId, {
        ...existing,
        hasSudo: grant,
        sudoCommands: grant ? commands : [],
      });

      return reply.send({
        success: true,
        data: { username, hasSudo: grant, sudoCommands: grant ? commands : [] },
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

  // Delete Unix account
  fastify.delete<{
    Params: { username: string };
  }>('/:username', async (request, reply) => {
    const { username } = request.params;

    try {
      await unixManager.deleteAccount(username);

      return reply.send({
        success: true,
        data: { username, deleted: true },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not exist')) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Unix account not found' },
        });
      }
      throw error;
    }
  });

  // Get Unix account info
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    const account = await fastify.redis.getUnixAccount(userId);
    if (!account) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Unix account not found' },
      });
    }

    return reply.send({
      success: true,
      data: account,
    });
  });
}
