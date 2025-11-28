import Dockerode from 'dockerode';
import { execSync } from 'child_process';
import { BaseExecutor, ExecutorContext } from './base.js';
import type { ExecuteResult, DockerParams } from '../types/index.js';
import pino from 'pino';

const logger = pino({ name: 'docker-executor' });

export class DockerExecutor extends BaseExecutor {
  private docker: Dockerode;

  constructor(context: ExecutorContext) {
    super(context);
    this.docker = new Dockerode();
  }

  async execute(parameters: Record<string, unknown>): Promise<ExecuteResult> {
    const params = parameters as DockerParams;
    const startTime = Date.now();

    logger.info({
      executionId: this.context.executionId,
      action: params.action,
      image: params.image,
      container: params.container,
    }, 'Starting Docker execution');

    await this.updateState({ status: 'running' });

    try {
      let result: { output: string; exitCode: number };

      switch (params.action) {
        case 'run':
          result = await this.runContainer(params);
          break;
        case 'build':
          result = await this.buildImage(params);
          break;
        case 'push':
          result = await this.pushImage(params);
          break;
        case 'pull':
          result = await this.pullImage(params);
          break;
        case 'exec':
          result = await this.execInContainer(params);
          break;
        case 'logs':
          result = await this.containerLogs(params);
          break;
        case 'stop':
          result = await this.stopContainer(params);
          break;
        case 'rm':
          result = await this.removeContainer(params);
          break;
        default:
          throw new Error(`Unknown Docker action: ${params.action}`);
      }

      const duration = Date.now() - startTime;
      const success = result.exitCode === 0;

      await this.updateState({
        status: success ? 'completed' : 'failed',
        exitCode: result.exitCode,
        duration,
        completedAt: Date.now(),
      });

      logger.info({
        executionId: this.context.executionId,
        action: params.action,
        exitCode: result.exitCode,
        duration,
        success,
      }, 'Docker execution completed');

      return {
        success,
        exitCode: result.exitCode,
        output: result.output,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Docker error';

      logger.error({
        error,
        executionId: this.context.executionId,
        action: params.action,
      }, 'Docker execution error');

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
    }
  }

  private async runContainer(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.image) throw new Error('Image required for run action');

    const options = (params.options || {}) as { env?: string[]; volumes?: string[] };
    const containerOptions: Dockerode.ContainerCreateOptions = {
      Image: params.image,
      Cmd: params.command?.split(' '),
    };
    if (options.env) {
      containerOptions.Env = options.env;
    }
    if (options.volumes) {
      containerOptions.HostConfig = { Binds: options.volumes };
    }
    const container = await this.docker.createContainer(containerOptions);

    await container.start();
    await this.emitOutput('stdout', `Container ${container.id.substring(0, 12)} started\n`);

    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    let output = '';
    stream.on('data', async (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      await this.emitOutput('stdout', text);
    });

    const data = await container.wait();
    return { output, exitCode: data.StatusCode };
  }

  private async buildImage(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    const options = params.options as Record<string, unknown> || {};
    const buildContext = options.context as string || '.';
    const dockerfile = options.dockerfile as string || 'Dockerfile';

    const stream = await this.docker.buildImage({
      context: buildContext,
      src: [dockerfile],
    }, {
      t: params.image,
    });

    let output = '';
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err) => {
        if (err) reject(err);
        else resolve();
      }, async (event) => {
        if (event.stream) {
          output += event.stream;
          await this.emitOutput('stdout', event.stream);
        }
      });
    });

    return { output, exitCode: 0 };
  }

  private async pushImage(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.image) throw new Error('Image required for push action');

    const image = this.docker.getImage(params.image);
    const stream = await image.push({});

    let output = '';
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err) => {
        if (err) reject(err);
        else resolve();
      }, async (event) => {
        const text = JSON.stringify(event) + '\n';
        output += text;
        await this.emitOutput('stdout', text);
      });
    });

    return { output, exitCode: 0 };
  }

  private async pullImage(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.image) throw new Error('Image required for pull action');

    const stream = await this.docker.pull(params.image);

    let output = '';
    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err) => {
        if (err) reject(err);
        else resolve();
      }, async (event) => {
        const text = `${event.status}${event.progress ? ': ' + event.progress : ''}\n`;
        output += text;
        await this.emitOutput('stdout', text);
      });
    });

    return { output, exitCode: 0 };
  }

  private async execInContainer(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.container) throw new Error('Container required for exec action');
    if (!params.command) throw new Error('Command required for exec action');

    const container = this.docker.getContainer(params.container);
    const exec = await container.exec({
      Cmd: params.command.split(' '),
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });

    let output = '';
    stream.on('data', async (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      await this.emitOutput('stdout', text);
    });

    await new Promise<void>((resolve) => {
      stream.on('end', resolve);
    });

    const inspect = await exec.inspect();
    return { output, exitCode: inspect.ExitCode || 0 };
  }

  private async containerLogs(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.container) throw new Error('Container required for logs action');

    const container = this.docker.getContainer(params.container);
    const options = params.options as Record<string, unknown> || {};

    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail as number || 100,
      timestamps: true,
    });

    const output = logs.toString();
    await this.emitOutput('stdout', output);

    return { output, exitCode: 0 };
  }

  private async stopContainer(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.container) throw new Error('Container required for stop action');

    const container = this.docker.getContainer(params.container);
    await container.stop();

    const output = `Container ${params.container} stopped\n`;
    await this.emitOutput('stdout', output);

    return { output, exitCode: 0 };
  }

  private async removeContainer(params: DockerParams): Promise<{ output: string; exitCode: number }> {
    if (!params.container) throw new Error('Container required for rm action');

    const container = this.docker.getContainer(params.container);
    const options = params.options as Record<string, unknown> || {};
    await container.remove({ force: options.force as boolean || false });

    const output = `Container ${params.container} removed\n`;
    await this.emitOutput('stdout', output);

    return { output, exitCode: 0 };
  }

  async checkHealth(): Promise<boolean> {
    try {
      execSync('docker --version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
