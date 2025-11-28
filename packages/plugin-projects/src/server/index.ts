import { Plugin } from '@nocobase/server';
import path from 'path';

export class PluginProjects extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Load collections
    await this.db.import({
      directory: path.resolve(__dirname, 'collections'),
    });

    // Register custom actions for project management
    this.app.resourcer.define({
      name: 'projects',
      actions: {
        // Clone a project from Git repository
        clone: async (ctx, next) => {
          const { repositoryUrl, branch = 'main', name } = ctx.action.params.values || {};

          if (!repositoryUrl || !name) {
            ctx.throw(400, 'Repository URL and name are required');
          }

          // Get the agent gateway client
          const agentGateway = this.app.container.get('agentGateway') as any;

          if (agentGateway && agentGateway.execute) {
            // Execute git clone via shell agent
            const result = await agentGateway.execute({
              agentType: 'shell',
              parameters: {
                command: `git clone --branch ${branch} ${repositoryUrl} /projects/${name}`,
              },
              userId: ctx.state.currentUser?.id,
            });

            ctx.body = {
              success: true,
              executionId: result.executionId,
              message: `Cloning ${repositoryUrl} to /projects/${name}`,
            };
          } else {
            ctx.throw(503, 'Agent Gateway not available');
          }

          await next();
        },

        // Deploy project
        deploy: async (ctx, next) => {
          const { filterByTk: projectId } = ctx.action.params;

          const project = await this.db.getRepository('projects').findOne({
            filter: { id: projectId },
          });

          if (!project) {
            ctx.throw(404, 'Project not found');
          }

          const agentGateway = this.app.container.get('agentGateway') as any;

          if (agentGateway && agentGateway.execute) {
            // Execute deployment workflow
            const result = await agentGateway.execute({
              agentType: 'shell',
              parameters: {
                command: `cd /projects/${project.slug} && ./deploy.sh`,
                env: project.environment || {},
              },
              userId: ctx.state.currentUser?.id,
            });

            ctx.body = {
              success: true,
              executionId: result.executionId,
              message: `Deploying project ${project.name}`,
            };
          } else {
            ctx.throw(503, 'Agent Gateway not available');
          }

          await next();
        },
      },
    });

    // Register ACL resources
    this.app.acl.registerSnippet({
      name: `pm.${this.name}`,
      actions: ['projects:*', 'project_members:*'],
    });

    this.app.logger.info('Projects plugin loaded');
  }

  async install() {
    await this.db.sync();
    this.app.logger.info('Projects plugin installed');
  }

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginProjects;
