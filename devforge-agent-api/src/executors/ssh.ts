import { NodeSSH } from 'node-ssh';
import { execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, SSHParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'ssh-executor' });

export class SSHExecutor extends BaseExecutor {
  constructor(context: ExecutorContext) {
    super(context);
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as SSHParams;
    const startTime = Date.now();

    logger.info({
      executionId: this.context.executionId,
      host: params.host,
      username: params.username,
      command: params.command.substring(0, 100),
    }, 'Starting SSH execution');

    await this.updateState({ status: 'running' });

    const ssh = new NodeSSH();

    try {
      // Build connection options
      const connectOptions: Parameters<NodeSSH['connect']>[0] = {
        host: params.host,
        port: params.port || 22,
        username: params.username,
        readyTimeout: 30000,
      };

      // Use private key from credentials or from params
      const privateKey = this.getCredential('SSH_PRIVATE_KEY') || params.privateKey;
      if (privateKey) {
        connectOptions.privateKey = privateKey;
      } else {
        // Try password from credentials
        const password = this.getCredential('SSH_PASSWORD');
        if (password) {
          connectOptions.password = password;
        }
      }

      await ssh.connect(connectOptions);
      await this.emitOutput('stdout', `Connected to ${params.host}\n`);

      // Build command with optional workDir
      let command = params.command;
      if (params.workDir) {
        command = `cd ${params.workDir} && ${command}`;
      }

      // Execute command with streaming
      const result = await ssh.execCommand(command, {
        onStdout: async (chunk: Buffer) => {
          await this.emitOutput('stdout', chunk.toString());
        },
        onStderr: async (chunk: Buffer) => {
          await this.emitOutput('stderr', chunk.toString());
        },
      });

      const duration = Date.now() - startTime;
      const exitCode = result.code ?? 0;
      const success = exitCode === 0;

      await this.updateState({
        status: success ? 'completed' : 'failed',
        exitCode,
        duration,
        completedAt: Date.now(),
      });

      logger.info({
        executionId: this.context.executionId,
        host: params.host,
        exitCode,
        duration,
        success,
      }, 'SSH execution completed');

      return {
        success,
        exitCode,
        output: result.stdout,
        error: result.stderr || undefined,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'SSH connection failed';

      logger.error({
        error,
        executionId: this.context.executionId,
        host: params.host,
      }, 'SSH execution error');

      await this.updateState({
        status: 'failed',
        error: errorMessage,
        duration,
        completedAt: Date.now(),
      });

      return {
        success: false,
        exitCode: 1,
        error: errorMessage,
        duration,
      };
    } finally {
      ssh.dispose();
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      execSync('ssh -V', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
