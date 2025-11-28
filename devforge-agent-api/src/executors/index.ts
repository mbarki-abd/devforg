import type { AgentType, ExecuteResult } from '../types/index.js';
import type { RedisService } from '../services/redis.js';
import type { ExecutionJob } from '../services/queue.js';
import { BaseExecutor, ExecutorContext } from './base.js';
import { ClaudeExecutor } from './claude.js';
import { ShellExecutor } from './shell.js';
import { SSHExecutor } from './ssh.js';
import { AzureExecutor } from './azure.js';
import { GCloudExecutor } from './gcloud.js';
import { DockerExecutor } from './docker.js';

export { BaseExecutor, ExecutorContext };
export { ClaudeExecutor };
export { ShellExecutor };
export { SSHExecutor };
export { AzureExecutor };
export { GCloudExecutor };
export { DockerExecutor };

export function createExecutor(
  agentType: AgentType,
  context: ExecutorContext
): BaseExecutor {
  switch (agentType) {
    case 'claude':
      return new ClaudeExecutor(context);
    case 'shell':
      return new ShellExecutor(context);
    case 'ssh':
      return new SSHExecutor(context);
    case 'azure':
      return new AzureExecutor(context);
    case 'gcloud':
      return new GCloudExecutor(context);
    case 'docker':
      return new DockerExecutor(context);
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

export function createExecutorFactory(redis: RedisService) {
  return (agentType: AgentType) => {
    return async (job: ExecutionJob): Promise<ExecuteResult> => {
      const context: ExecutorContext = {
        executionId: job.executionId,
        userId: job.userId,
        unixUser: job.unixUser,
        credentials: job.credentials,
        redis,
      };

      const executor = createExecutor(agentType, context);
      return executor.execute(job.parameters);
    };
  };
}
