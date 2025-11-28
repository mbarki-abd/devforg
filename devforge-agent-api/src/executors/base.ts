import { EventEmitter } from 'events';
import type { ExecuteResult, WsOutputEvent } from '../types/index.js';
import type { RedisService } from '../services/redis.js';

export interface ExecutorContext {
  executionId: string;
  userId: string;
  unixUser?: string;
  credentials?: Record<string, string>;
  redis: RedisService;
}

export abstract class BaseExecutor extends EventEmitter {
  protected context: ExecutorContext;

  constructor(context: ExecutorContext) {
    super();
    this.context = context;
  }

  abstract execute(parameters: Record<string, unknown>): Promise<ExecuteResult>;
  abstract checkHealth(): Promise<boolean>;

  protected async emitOutput(stream: 'stdout' | 'stderr', data: string): Promise<void> {
    const event: WsOutputEvent = {
      type: 'output',
      executionId: this.context.executionId,
      timestamp: Date.now(),
      stream,
      data,
    };

    // Publish to Redis for WebSocket broadcast
    await this.context.redis.publish(`execution:${this.context.executionId}`, event);

    // Also emit locally
    this.emit('output', event);
  }

  protected async updateState(state: Record<string, unknown>): Promise<void> {
    const currentState = await this.context.redis.getExecutionState(this.context.executionId);
    await this.context.redis.setExecutionState(this.context.executionId, {
      ...currentState,
      ...state,
      updatedAt: Date.now(),
    });
  }

  protected getCredential(key: string): string | undefined {
    return this.context.credentials?.[key];
  }
}
