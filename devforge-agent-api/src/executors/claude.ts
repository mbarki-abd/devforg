import { spawn, execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, ClaudeParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'claude-executor' });

export class ClaudeExecutor extends BaseExecutor {
  constructor(context: ExecutorContext) {
    super(context);
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as ClaudeParams;
    const startTime = Date.now();

    logger.info({
      executionId: this.context.executionId,
      prompt: params.prompt.substring(0, 100) + '...',
      workDir: params.workDir,
      model: params.model,
    }, 'Starting Claude execution');

    await this.updateState({ status: 'running' });

    return new Promise((resolve) => {
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      // Set API key from credentials
      const apiKey = this.getCredential('ANTHROPIC_API_KEY');
      if (apiKey) {
        env.ANTHROPIC_API_KEY = apiKey;
      }

      // Build command arguments
      const args: string[] = ['--print'];

      if (params.model) {
        args.push('--model', params.model);
      }

      // Determine if we should run as a different Unix user
      let command: string;
      let commandArgs: string[];

      if (this.context.unixUser) {
        // Run as specific Unix user
        command = 'sudo';
        commandArgs = [
          '-u', this.context.unixUser,
          '-H',
          '--preserve-env=ANTHROPIC_API_KEY',
          'claude',
          ...args,
          params.prompt,
        ];
      } else {
        command = 'claude';
        commandArgs = [...args, params.prompt];
      }

      const proc = spawn(command, commandArgs, {
        cwd: params.workDir || process.cwd(),
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
        }, 'Claude execution completed');

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
          executionId: this.context.executionId
        }, 'Claude process error');

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

      // Handle timeout
      if (params.timeout) {
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGTERM');
            setTimeout(() => {
              if (!proc.killed) {
                proc.kill('SIGKILL');
              }
            }, 5000);
          }
        }, params.timeout * 1000);
      }
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      execSync('claude --version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
