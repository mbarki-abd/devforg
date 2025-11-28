import { Queue, Worker, Job } from 'bullmq';
import pino from 'pino';
import { RedisService } from './redis.js';
import type { AgentType, ExecuteResult } from '../types/index.js';

const logger = pino({ name: 'queue-service' });

export interface ExecutionJob {
  executionId: string;
  agentType: AgentType;
  parameters: Record<string, unknown>;
  credentials?: Record<string, string>;
  unixUser?: string;
  userId: string;
}

export class QueueService {
  private queues: Map<AgentType, Queue> = new Map();
  private workers: Map<AgentType, Worker> = new Map();
  private redis: RedisService;

  constructor(redis: RedisService) {
    this.redis = redis;
  }

  initialize(
    executorFactory: (agentType: AgentType) => (job: ExecutionJob) => Promise<ExecuteResult>
  ): void {
    const agentTypes: AgentType[] = ['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell'];

    for (const agentType of agentTypes) {
      // Create queue for each agent type
      const queue = new Queue(`devforge-${agentType}`, {
        connection: this.redis.getClient().duplicate(),
      });
      this.queues.set(agentType, queue);

      // Create worker for each agent type
      const executor = executorFactory(agentType);
      const worker = new Worker(
        `devforge-${agentType}`,
        async (job: Job<ExecutionJob>) => {
          logger.info({ jobId: job.id, executionId: job.data.executionId }, 'Processing job');

          try {
            const result = await executor(job.data);

            // Publish completion event
            await this.redis.publish(`execution:${job.data.executionId}`, {
              type: 'complete',
              executionId: job.data.executionId,
              timestamp: Date.now(),
              success: result.success,
              exitCode: result.exitCode,
              duration: result.duration,
            });

            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({ error, jobId: job.id }, 'Job failed');

            // Publish error event
            await this.redis.publish(`execution:${job.data.executionId}`, {
              type: 'error',
              executionId: job.data.executionId,
              timestamp: Date.now(),
              error: errorMessage,
            });

            throw error;
          }
        },
        {
          connection: this.redis.getClient().duplicate(),
          concurrency: this.getConcurrency(agentType),
        }
      );

      worker.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Job completed');
      });

      worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err }, 'Job failed');
      });

      this.workers.set(agentType, worker);
    }

    logger.info('Queue service initialized');
  }

  private getConcurrency(agentType: AgentType): number {
    // Configure concurrency based on agent type
    const concurrencyMap: Record<AgentType, number> = {
      claude: 3,    // Claude can handle multiple concurrent
      azure: 5,     // CLI commands are lightweight
      gcloud: 5,
      ssh: 10,      // SSH connections are lightweight
      docker: 5,
      shell: 10,
    };
    return concurrencyMap[agentType];
  }

  async add(agentType: AgentType, job: ExecutionJob): Promise<string> {
    const queue = this.queues.get(agentType);
    if (!queue) {
      throw new Error(`Queue not found for agent type: ${agentType}`);
    }

    const result = await queue.add(job.executionId, job, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    logger.info({ jobId: result.id, executionId: job.executionId, agentType }, 'Job added to queue');

    return result.id!;
  }

  async getJob(agentType: AgentType, jobId: string): Promise<Job<ExecutionJob> | undefined> {
    const queue = this.queues.get(agentType);
    return queue?.getJob(jobId);
  }

  async getQueueStatus(agentType: AgentType): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const queue = this.queues.get(agentType);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async close(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    logger.info('Queue service closed');
  }
}
