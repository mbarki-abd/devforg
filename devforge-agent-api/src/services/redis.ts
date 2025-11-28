import { Redis } from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'redis-service' });

export class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private isConnected = false;

  constructor(url: string) {
    // BullMQ requires maxRetriesPerRequest: null
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        if (times > 10) return null;
        return Math.min(times * 50, 2000);
      },
    });

    this.subscriber = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected');
    });

    this.client.on('error', (err: Error) => {
      logger.error({ err }, 'Redis error');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis disconnected');
    });
  }

  async connect(): Promise<void> {
    await this.client.ping();
    logger.info('Redis connection verified');
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    logger.info('Redis disconnected');
  }

  get connected(): boolean {
    return this.isConnected;
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // Credential cache methods
  async cacheCredential(userId: string, provider: string, credential: string, ttl = 3600): Promise<void> {
    const key = `cred:${userId}:${provider}`;
    await this.client.setex(key, ttl, credential);
  }

  async getCredential(userId: string, provider: string): Promise<string | null> {
    const key = `cred:${userId}:${provider}`;
    return this.client.get(key);
  }

  async deleteCredential(userId: string, provider: string): Promise<void> {
    const key = `cred:${userId}:${provider}`;
    await this.client.del(key);
  }

  // Execution state
  async setExecutionState(executionId: string, state: Record<string, unknown>, ttl = 86400): Promise<void> {
    const key = `exec:${executionId}`;
    await this.client.setex(key, ttl, JSON.stringify(state));
  }

  async getExecutionState(executionId: string): Promise<Record<string, unknown> | null> {
    const key = `exec:${executionId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Pub/Sub for execution events
  async publish(channel: string, message: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: unknown) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch: string, msg: string) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }

  // Unix account cache
  async setUnixAccount(userId: string, account: Record<string, unknown>): Promise<void> {
    const key = `unix:${userId}`;
    await this.client.set(key, JSON.stringify(account));
  }

  async getUnixAccount(userId: string): Promise<Record<string, unknown> | null> {
    const key = `unix:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
}
