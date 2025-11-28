import { Plugin } from '@nocobase/server';
import path from 'path';

interface WorkflowStep {
  id: string;
  type: 'shell' | 'claude' | 'azure' | 'gcloud' | 'docker' | 'ssh' | 'condition' | 'parallel';
  name: string;
  parameters: Record<string, unknown>;
  onSuccess?: string;
  onFailure?: string;
}

interface WorkflowExecution {
  workflowId: string;
  currentStep: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  context: Record<string, unknown>;
  executionIds: string[];
}

export class PluginWorkflows extends Plugin {
  private runningWorkflows: Map<string, WorkflowExecution> = new Map();

  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Load collections
    await this.db.import({
      directory: path.resolve(__dirname, 'collections'),
    });

    // Register workflow execution actions
    this.app.resourcer.define({
      name: 'devforge-workflows',
      actions: {
        // Execute a workflow
        run: async (ctx, next) => {
          const { filterByTk: workflowId } = ctx.action.params;
          const { variables = {} } = ctx.action.params.values || {};

          const workflow = await this.db.getRepository('devforge_workflows').findOne({
            filter: { id: workflowId },
          });

          if (!workflow) {
            ctx.throw(404, 'Workflow not found');
          }

          const executionRecord = await this.db.getRepository('workflow_runs').create({
            values: {
              workflowId,
              status: 'running',
              startedAt: new Date(),
              triggeredBy: ctx.state.currentUser?.id,
              variables,
              logs: [],
            },
          });

          // Start workflow execution in background
          this.executeWorkflow(workflow, executionRecord.id, variables, ctx.state.currentUser?.id);

          ctx.body = {
            success: true,
            runId: executionRecord.id,
            message: `Workflow "${workflow.name}" started`,
          };

          await next();
        },

        // Get workflow run status
        runStatus: async (ctx, next) => {
          const { filterByTk: runId } = ctx.action.params;

          const run = await this.db.getRepository('workflow_runs').findOne({
            filter: { id: runId },
            include: ['workflow'],
          });

          if (!run) {
            ctx.throw(404, 'Workflow run not found');
          }

          ctx.body = run;
          await next();
        },

        // Cancel a running workflow
        cancel: async (ctx, next) => {
          const { filterByTk: runId } = ctx.action.params;

          const run = await this.db.getRepository('workflow_runs').findOne({
            filter: { id: runId },
          });

          if (!run) {
            ctx.throw(404, 'Workflow run not found');
          }

          if (run.status !== 'running') {
            ctx.throw(400, 'Workflow is not running');
          }

          // Update status
          await this.db.getRepository('workflow_runs').update({
            filter: { id: runId },
            values: {
              status: 'cancelled',
              finishedAt: new Date(),
            },
          });

          // Remove from running workflows
          this.runningWorkflows.delete(runId);

          ctx.body = {
            success: true,
            message: 'Workflow cancelled',
          };

          await next();
        },
      },
    });

    // Register ACL resources
    this.app.acl.registerSnippet({
      name: `pm.${this.name}`,
      actions: ['devforge_workflows:*', 'workflow_runs:*', 'workflow_steps:*'],
    });

    this.app.logger.info('Workflows plugin loaded');
  }

  private async executeWorkflow(
    workflow: any,
    runId: string,
    variables: Record<string, unknown>,
    userId: string
  ) {
    const agentGateway = this.app.container.get('agentGateway');
    if (!agentGateway) {
      await this.updateRunStatus(runId, 'failed', 'Agent Gateway not available');
      return;
    }

    const steps: WorkflowStep[] = workflow.steps || [];
    const context: Record<string, unknown> = { ...variables };

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Update current step
        await this.addLog(runId, `Starting step ${i + 1}: ${step.name}`);

        if (step.type === 'condition') {
          // Handle conditional logic
          const condition = this.evaluateCondition(step.parameters, context);
          const nextStep = condition ? step.onSuccess : step.onFailure;

          if (nextStep) {
            // Jump to specific step
            const jumpIndex = steps.findIndex((s) => s.id === nextStep);
            if (jumpIndex >= 0) {
              i = jumpIndex - 1; // Will be incremented by loop
            }
          }
          continue;
        }

        if (step.type === 'parallel') {
          // Execute multiple steps in parallel
          const parallelSteps = step.parameters.steps as WorkflowStep[];
          const results = await Promise.allSettled(
            parallelSteps.map((ps) =>
              this.executeStep(agentGateway, ps, context, userId)
            )
          );

          // Collect results
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              context[`parallel_${idx}`] = result.value;
            }
          });

          continue;
        }

        // Execute regular step
        const result = await this.executeStep(agentGateway, step, context, userId);
        context[`step_${i}_result`] = result;
        context.lastResult = result;

        await this.addLog(runId, `Completed step ${i + 1}: ${step.name}`);
      }

      await this.updateRunStatus(runId, 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateRunStatus(runId, 'failed', errorMessage);
    }
  }

  private async executeStep(
    agentGateway: any,
    step: WorkflowStep,
    context: Record<string, unknown>,
    userId: string
  ): Promise<unknown> {
    // Replace variables in parameters
    const parameters = this.interpolateVariables(step.parameters, context);

    const result = await agentGateway.execute({
      agentType: step.type,
      parameters,
      userId,
    });

    // Wait for completion
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Step execution timeout'));
      }, 300000); // 5 minutes timeout

      agentGateway.waitForCompletion(result.executionId)
        .then((res: any) => {
          clearTimeout(timeout);
          if (res.success) {
            resolve(res);
          } else {
            reject(new Error(res.error || 'Step failed'));
          }
        })
        .catch((err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  private evaluateCondition(
    params: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    const { field, operator, value } = params;
    const fieldValue = this.getContextValue(field as string, context);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private getContextValue(path: string, context: Record<string, unknown>): unknown {
    return path.split('.').reduce((obj: any, key) => obj?.[key], context);
  }

  private interpolateVariables(
    params: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        result[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
          const contextValue = this.getContextValue(path, context);
          return contextValue !== undefined ? String(contextValue) : '';
        });
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateVariables(
          value as Record<string, unknown>,
          context
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private async updateRunStatus(runId: string, status: string, error?: string) {
    const values: Record<string, unknown> = {
      status,
      finishedAt: status !== 'running' ? new Date() : undefined,
    };

    if (error) {
      values.error = error;
    }

    await this.db.getRepository('workflow_runs').update({
      filter: { id: runId },
      values,
    });
  }

  private async addLog(runId: string, message: string) {
    const run = await this.db.getRepository('workflow_runs').findOne({
      filter: { id: runId },
    });

    const logs = run?.logs || [];
    logs.push({
      timestamp: new Date().toISOString(),
      message,
    });

    await this.db.getRepository('workflow_runs').update({
      filter: { id: runId },
      values: { logs },
    });
  }

  async install() {
    await this.db.sync();
    this.app.logger.info('Workflows plugin installed');
  }

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginWorkflows;
