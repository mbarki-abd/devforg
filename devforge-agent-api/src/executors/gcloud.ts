import { spawn, execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, GCloudParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'gcloud-executor' });

export class GCloudExecutor extends BaseExecutor {
  constructor(context: ExecutorContext) {
    super(context);
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as GCloudParams;
    const startTime = Date.now();

    logger.info({
      executionId: this.context.executionId,
      command: params.command.substring(0, 100),
      project: params.project,
      region: params.region,
    }, 'Starting gcloud execution');

    await this.updateState({ status: 'running' });

    return new Promise((resolve) => {
      // Build full gcloud command
      let command = params.command;

      // Add project if specified
      if (params.project && !command.includes('--project')) {
        command += ` --project ${params.project}`;
      }

      // Add region if specified
      if (params.region && !command.includes('--region')) {
        command += ` --region ${params.region}`;
      }

      // Add format for consistent output
      if (!command.includes('--format')) {
        command += ' --format=json';
      }

      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      // Set Google Cloud credentials from context
      const credentialsPath = this.getCredential('GOOGLE_APPLICATION_CREDENTIALS');
      if (credentialsPath) {
        env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      }

      let shellCommand: string;
      let shellArgs: string[];

      if (this.context.unixUser) {
        shellCommand = 'sudo';
        shellArgs = ['-u', this.context.unixUser, '-H', 'bash', '-c', `gcloud ${command}`];
      } else {
        shellCommand = 'bash';
        shellArgs = ['-c', `gcloud ${command}`];
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
        }, 'gcloud execution completed');

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
        }, 'gcloud process error');

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
      execSync('gcloud --version', { stdio: 'pipe', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}
