import { z } from 'zod';

// Agent types
export type AgentType = 'claude' | 'azure' | 'gcloud' | 'ssh' | 'docker' | 'shell';

// Execution request from NocoBase
export const ExecuteRequestSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: z.number(),
  signature: z.string(),
  payload: z.object({
    executionId: z.string().uuid(),
    agentType: z.enum(['claude', 'azure', 'gcloud', 'ssh', 'docker', 'shell']),
    parameters: z.record(z.unknown()),
    credentials: z.record(z.string()).optional(),
    unixUser: z.string().optional(),
    userId: z.string(),
  }),
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

// Agent-specific parameters
export const ClaudeParamsSchema = z.object({
  prompt: z.string(),
  workDir: z.string().optional(),
  model: z.enum(['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022']).optional(),
  timeout: z.number().optional(),
  mcpServers: z.record(z.unknown()).optional(),
});

export const AzureParamsSchema = z.object({
  command: z.string(),
  subscription: z.string().optional(),
  resourceGroup: z.string().optional(),
});

export const GCloudParamsSchema = z.object({
  command: z.string(),
  project: z.string().optional(),
  region: z.string().optional(),
});

export const SSHParamsSchema = z.object({
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  command: z.string(),
  workDir: z.string().optional(),
  privateKey: z.string().optional(),
});

export const DockerParamsSchema = z.object({
  action: z.enum(['run', 'build', 'push', 'pull', 'exec', 'logs', 'stop', 'rm']),
  image: z.string().optional(),
  container: z.string().optional(),
  command: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const ShellParamsSchema = z.object({
  command: z.string(),
  workDir: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout: z.number().optional(),
});

export type ClaudeParams = z.infer<typeof ClaudeParamsSchema>;
export type AzureParams = z.infer<typeof AzureParamsSchema>;
export type GCloudParams = z.infer<typeof GCloudParamsSchema>;
export type SSHParams = z.infer<typeof SSHParamsSchema>;
export type DockerParams = z.infer<typeof DockerParamsSchema>;
export type ShellParams = z.infer<typeof ShellParamsSchema>;

// Execution result
export interface ExecuteResult {
  success: boolean;
  exitCode: number;
  output?: string;
  error?: string;
  duration: number;
  artifacts?: Record<string, unknown>;
}

// API Response
export interface ApiResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// WebSocket events
export interface WsOutputEvent {
  type: 'output';
  executionId: string;
  timestamp: number;
  stream: 'stdout' | 'stderr';
  data: string;
}

export interface WsCompleteEvent {
  type: 'complete';
  executionId: string;
  timestamp: number;
  success: boolean;
  exitCode: number;
  duration: number;
}

export interface WsErrorEvent {
  type: 'error';
  executionId: string;
  timestamp: number;
  error: string;
}

export type WsEvent = WsOutputEvent | WsCompleteEvent | WsErrorEvent;

// Unix account
export interface UnixAccount {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  [key: string]: string | number;
}

export const CreateUnixAccountSchema = z.object({
  userId: z.string(),
  username: z.string().regex(/^[a-z][a-z0-9_]{2,31}$/, 'Invalid username format'),
});

export const SudoGrantSchema = z.object({
  userId: z.string(),
  username: z.string(),
  commands: z.array(z.string()).optional(),
  grant: z.boolean(),
});

// Health check
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  agents: Record<AgentType, {
    available: boolean;
    lastCheck: number;
    error?: string;
  }>;
  redis: {
    connected: boolean;
  };
}
