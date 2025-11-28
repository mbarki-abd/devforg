import { FastifyInstance } from 'fastify';
import { execSync } from 'child_process';
import type { AgentType, HealthStatus } from '../types/index.js';

const startTime = Date.now();
const version = process.env.npm_package_version || '1.0.0';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check - no auth required
  fastify.get('/', async (request, reply) => {
    const agentTypes: AgentType[] = ['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell'];
    const agents: HealthStatus['agents'] = {} as HealthStatus['agents'];

    for (const agentType of agentTypes) {
      agents[agentType] = await checkAgentHealth(agentType);
    }

    const allHealthy = Object.values(agents).every(a => a.available);
    const someHealthy = Object.values(agents).some(a => a.available);

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : (someHealthy ? 'degraded' : 'unhealthy'),
      version,
      uptime: Date.now() - startTime,
      agents,
      redis: {
        connected: fastify.redis.connected,
      },
    };

    const httpStatus = status.status === 'healthy' ? 200 : (status.status === 'degraded' ? 200 : 503);
    return reply.code(httpStatus).send(status);
  });

  // Liveness probe
  fastify.get('/live', async (request, reply) => {
    return reply.send({ status: 'ok' });
  });

  // Readiness probe
  fastify.get('/ready', async (request, reply) => {
    if (!fastify.redis.connected) {
      return reply.code(503).send({ status: 'not ready', reason: 'Redis not connected' });
    }
    return reply.send({ status: 'ready' });
  });
}

async function checkAgentHealth(agentType: AgentType): Promise<{
  available: boolean;
  lastCheck: number;
  error?: string;
}> {
  const commands: Record<AgentType, string> = {
    claude: 'claude --version',
    azure: 'az --version',
    gcloud: 'gcloud --version',
    ssh: 'ssh -V',
    docker: 'docker --version',
    shell: 'bash --version',
  };

  try {
    execSync(commands[agentType], { stdio: 'pipe', timeout: 5000 });
    return {
      available: true,
      lastCheck: Date.now(),
    };
  } catch (error) {
    return {
      available: false,
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : 'Check failed',
    };
  }
}
