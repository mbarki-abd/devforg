import { spawn, execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, AzureParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'azure-executor' });

export class AzureExecutor extends BaseExecutor {
  constructor(context: ExecutorContext) {
    super(context);
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as AzureParams;
    const startTime = Date.now();

    logger.info({
      executionId: this.context.executionId,
      command: params.command.substring(0, 100),
      subscription: params.subscription,
      resourceGroup: params.resourceGroup,
    }, 'Starting Azure CLI execution');

    await this.updateState({ status: 'running' });

    return new Promise((resolve) => {
      // Build full az command
      let command = params.command;

      // Add subscription if specified
      if (params.subscription && !command.includes('--subscription')) {
        command += ` --subscription ${params.subscription}`;
      }

      // Add resource group if specified
      if (params.resourceGroup && !command.includes('--resource-group') && !command.includes('-g ')) {
        command += ` --resource-group ${params.resourceGroup}`;
      }

      // Add output format for consistent parsing
      if (!command.includes('--output') && !command.includes('-o ')) {
        command += ' --output json';
      }

      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      // Set Azure credentials from context
      const clientId = this.getCredential('AZURE_CLIENT_ID');
      const clientSecret = this.getCredential('AZURE_CLIENT_SECRET');
      const tenantId = this.getCredential('AZURE_TENANT_ID');

      if (clientId && clientSecret && tenantId) {
        env.AZURE_CLIENT_ID = clientId;
        env.AZURE_CLIENT_SECRET = clientSecret;
        env.AZURE_TENANT_ID = tenantId;
      }

      let shellCommand: string;
      let shellArgs: string[];

      if (this.context.unixUser) {
        shellCommand = 'sudo';
        shellArgs = ['-u', this.context.unixUser, '-H', 'bash', '-c', `az ${command}`];
      } else {
        shellCommand = 'bash';
        shellArgs = ['-c', `az ${command}`];
      }

      const proc = spawn(shellCommand, shellArgs, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', async (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        await this.emitOutput('stdout', text);
      });

      proc.stderr.on('data', async (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        await this.emitOutput('stderr', text);
      });

      proc.on('close', async (code) => {
        const duration = Date.now() - startTime;
        const exitCode = code ?? 1;
        const success = exitCode === 0;

        await this.updateState({
          status: success ? 'completed' : 'failed',
          exitCode,
          duration,
          completedAt: Date.now(),
        });

        logger.info({
          executionId: this.context.executionId,
          exitCode,
          duration,
          success,
        }, 'Azure CLI execution completed');

        resolve({
          success,
          exitCode,
          output: stdout,
          error: stderr || undefined,
          duration,
        });
      });

      proc.on('error', async (error) => {
        const duration = Date.now() - startTime;

        logger.error({
          error,
          executionId: this.context.executionId,
        }, 'Azure CLI process error');

        await this.updateState({
          status: 'failed',
          error: error.message,
          duration,
          completedAt: Date.now(),
        });

        resolve({
          success: false,
          exitCode: 1,
          error: error.message,
          duration,
        });
      });
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      execSync('az --version', { stdio: 'pipe', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}
