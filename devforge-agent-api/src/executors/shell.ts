import { spawn, execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, ShellParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'shell-executor' });

export class ShellExecutor extends BaseExecutor {
  constructor(context: ExecutorContext) {
    super(context);
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as ShellParams;
    const startTime = Date.now();
    const timeout = params.timeout || 300000; // 5 minutes default

    logger.info({
      executionId: this.context.executionId,
      command: params.command.substring(0, 100),
      workDir: params.workDir,
    }, 'Starting shell execution');

    await this.updateState({ status: 'running' });

    return new Promise((resolve) => {
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        ...params.env,
      };

      let command: string;
      let commandArgs: string[];

      if (this.context.unixUser) {
        // Run as specific Unix user
        command = 'sudo';
        commandArgs = [
          '-u', this.context.unixUser,
          '-H',
          'bash', '-c', params.command,
        ];
      } else {
        command = 'bash';
        commandArgs = ['-c', params.command];
      }

      const proc = spawn(command, commandArgs, {
        cwd: params.workDir || process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

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
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        const exitCode = timedOut ? 124 : (code ?? 1);
        const success = exitCode === 0;

        await this.updateState({
          status: success ? 'completed' : 'failed',
          exitCode,
          duration,
          completedAt: Date.now(),
          timedOut,
        });

        logger.info({
          executionId: this.context.executionId,
          exitCode,
          duration,
          success,
          timedOut,
        }, 'Shell execution completed');

        resolve({
          success,
          exitCode,
          output: stdout,
          error: timedOut ? 'Command timed out' : (stderr || undefined),
          duration,
        });
      });

      proc.on('error', async (error) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        logger.error({
          error,
          executionId: this.context.executionId,
        }, 'Shell process error');

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
      execSync('bash --version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
