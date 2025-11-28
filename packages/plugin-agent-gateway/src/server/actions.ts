import { Context } from '@nocobase/actions';
import { Database } from '@nocobase/database';
import { AgentGatewayClient, ExecuteParams } from './client';
import crypto from 'crypto';

export class AgentGatewayActions {
  private client: AgentGatewayClient;
  private db: Database;

  constructor(client: AgentGatewayClient, db: Database) {
    this.client = client;
    this.db = db;
  }

  async execute(ctx: Context, next: () => Promise<void>) {
    const { agentType, taskId, parameters } = ctx.action.params.values || {};
    const user = ctx.state.currentUser;

    if (!agentType || !parameters) {
      ctx.throw(400, 'agentType and parameters are required');
    }

    try {
      // Get user's credentials for the agent type
      const credentials = await this.getUserCredentials(user.id, agentType);

      // Get user's Unix account if exists
      const unixAccount = await this.getUnixAccount(user.id);

      // Generate execution ID
      const executionId = crypto.randomUUID();

      // Create execution record in database
      const executionsRepo = this.db.getRepository('executions');
      const execution = await executionsRepo.create({
        values: {
          id: executionId,
          task: taskId,
          status: 'pending',
          agentType,
          user: user.id,
          startedAt: new Date(),
        },
      });

      // Send to Agent API
      const result = await this.client.execute({
        executionId,
        agentType,
        parameters,
        credentials,
        unixUser: unixAccount?.username,
        userId: user.id,
      });

      // Subscribe to execution events
      this.client.subscribeToExecution(executionId);

      ctx.body = {
        success: true,
        data: {
          executionId,
          jobId: result.jobId,
          status: result.status,
          wsChannel: `execution:${executionId}`,
        },
      };
    } catch (error) {
      ctx.throw(500, error instanceof Error ? error.message : 'Execution failed');
    }

    await next();
  }

  async status(ctx: Context, next: () => Promise<void>) {
    const { executionId, agentType } = ctx.action.params;

    try {
      let result;
      if (executionId) {
        result = await this.client.getStatus(executionId);
      } else {
        result = await this.client.getAgentStatus(agentType);
      }

      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      ctx.throw(500, error instanceof Error ? error.message : 'Failed to get status');
    }

    await next();
  }

  async cancel(ctx: Context, next: () => Promise<void>) {
    const { executionId } = ctx.action.params.values || {};
    const user = ctx.state.currentUser;

    if (!executionId) {
      ctx.throw(400, 'executionId is required');
    }

    try {
      // Verify user owns this execution
      const executionsRepo = this.db.getRepository('executions');
      const execution = await executionsRepo.findOne({
        filter: { id: executionId },
      });

      if (!execution) {
        ctx.throw(404, 'Execution not found');
      }

      if (execution.get('user') !== user.id) {
        // Check if user has admin permission
        const hasAdminAccess = await this.checkPermission(user.id, 'executions:cancel_all');
        if (!hasAdminAccess) {
          ctx.throw(403, 'You can only cancel your own executions');
        }
      }

      // Cancel in Agent API
      const result = await this.client.cancel(executionId);

      // Update database
      await executionsRepo.update({
        filter: { id: executionId },
        values: {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
      });

      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error;
      }
      ctx.throw(500, error instanceof Error ? error.message : 'Failed to cancel execution');
    }

    await next();
  }

  async health(ctx: Context, next: () => Promise<void>) {
    try {
      const result = await this.client.getHealth();
      ctx.body = {
        success: true,
        data: result,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }

    await next();
  }

  private async getUserCredentials(
    userId: string,
    agentType: string
  ): Promise<Record<string, string> | undefined> {
    const credentialsRepo = this.db.getRepository('credentials');

    // Map agent types to credential providers
    const providerMap: Record<string, string> = {
      claude: 'anthropic',
      azure: 'azure',
      gcloud: 'gcloud',
      ssh: 'ssh',
      docker: 'docker',
    };

    const provider = providerMap[agentType];
    if (!provider) return undefined;

    const credential = await credentialsRepo.findOne({
      filter: {
        user: userId,
        provider,
        status: 'active',
      },
    });

    if (!credential) return undefined;

    // Decrypt and return credentials
    const encrypted = credential.get('credentials') as string;
    // Note: NocoBase handles encryption/decryption for encryption field type
    return JSON.parse(encrypted);
  }

  private async getUnixAccount(userId: string): Promise<{ username: string } | null> {
    const unixAccountsRepo = this.db.getRepository('unix_accounts');

    const account = await unixAccountsRepo.findOne({
      filter: {
        user: userId,
        status: 'active',
      },
    });

    if (!account) return null;

    return {
      username: account.get('username') as string,
    };
  }

  private async checkPermission(userId: string, permission: string): Promise<boolean> {
    // This would integrate with NocoBase's ACL system
    // For now, return false - will be implemented with proper RBAC
    return false;
  }
}
