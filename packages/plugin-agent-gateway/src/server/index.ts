import { Plugin, InstallOptions } from '@nocobase/server';
import path from 'path';
import { AgentGatewayClient } from './client';
import { AgentGatewayActions } from './actions';
import { devforgeMenuSchema, devforgePages } from './ui-schema';

export class PluginAgentGateway extends Plugin {
  private client!: AgentGatewayClient;

  async afterAdd() {
    // Plugin added
  }

  async beforeLoad() {
    // Before loading
  }

  async load() {
    // Load collections (agents)
    await this.db.import({
      directory: path.resolve(__dirname, 'collections'),
    });

    // Initialize the Agent API client
    const apiUrl = process.env.AGENT_API_URL || 'http://localhost:8080';
    const apiKey = process.env.AGENT_API_KEY || '';

    this.client = new AgentGatewayClient({
      url: apiUrl,
      apiKey,
    });

    // Register client as a service
    this.app.container.register('agentGateway', this.client);

    // Register custom actions
    const actions = new AgentGatewayActions(this.client, this.db);

    this.app.resourcer.define({
      name: 'agent-gateway',
      actions: {
        execute: actions.execute.bind(actions),
        status: actions.status.bind(actions),
        cancel: actions.cancel.bind(actions),
        health: actions.health.bind(actions),
      },
    });

    // Register ACL resources
    this.app.acl.registerSnippet({
      name: `pm.${this.name}`,
      actions: ['agents:*', 'agent-gateway:*'],
    });

    // Setup WebSocket relay for real-time updates
    this.setupWebSocketRelay();

    this.app.logger.info('Agent Gateway plugin loaded');
  }

  private setupWebSocketRelay() {
    // Listen for events from Agent API
    this.client.onEvent((event) => {
      // Broadcast to connected clients via NocoBase's WebSocket if available
      const app = this.app as any;
      if (app.ws) {
        app.ws.broadcast(`execution:${event.executionId}`, event);
      }
    });
  }

  async install(options?: InstallOptions) {
    // Sync database schema
    await this.db.sync();

    // Create DevForge menu and pages
    await this.createDevForgeUI();

    this.app.logger.info('Agent Gateway plugin installed with UI');
  }

  /**
   * Creates the DevForge menu and pages using NocoBase UI Schema API
   */
  private async createDevForgeUI() {
    const uiSchemaRepository = this.db.getRepository('uiSchemas');

    // Check if DevForge menu already exists
    const existingMenu = await uiSchemaRepository.findOne({
      filter: { 'x-uid': 'devforge-main-menu' }
    });

    if (existingMenu) {
      this.app.logger.info('DevForge menu already exists, skipping creation');
      return;
    }

    try {
      // Get the UI Schema storage plugin
      const uiSchemaStoragePlugin = this.app.pm.get('@nocobase/plugin-ui-schema-storage');
      if (!uiSchemaStoragePlugin) {
        this.app.logger.warn('UI Schema Storage plugin not found');
        return;
      }

      // Insert DevForge menu into admin menu
      const adminMenuSchema = await uiSchemaRepository.findOne({
        filter: { 'x-uid': 'nocobase-admin-menu' }
      });

      if (!adminMenuSchema) {
        this.app.logger.warn('Admin menu not found, creating standalone menu');
      }

      // Create the DevForge submenu
      await this.insertUISchema(devforgeMenuSchema);

      // Create each DevForge page
      for (const page of devforgePages) {
        await this.insertUISchema(page);
      }

      // Grant access to admin role
      await this.grantMenuAccess();

      this.app.logger.info('DevForge UI created successfully');
    } catch (error: any) {
      this.app.logger.error('Failed to create DevForge UI:', error?.message || error);
    }
  }

  /**
   * Insert UI schema using the proper NocoBase method
   */
  private async insertUISchema(schema: any) {
    const uiSchemaStoragePlugin = this.app.pm.get('@nocobase/plugin-ui-schema-storage') as any;
    if (uiSchemaStoragePlugin?.uiSchemaRepository) {
      await uiSchemaStoragePlugin.uiSchemaRepository.insert(schema);
    }
  }

  /**
   * Grant menu access to admin role
   */
  private async grantMenuAccess() {
    const rolesRepository = this.db.getRepository('roles');
    const adminRole = await rolesRepository.findOne({ filter: { name: 'admin' } });

    if (adminRole) {
      const menuUids = ['devforge-main-menu', ...devforgePages.map(p => p['x-uid'])];

      // Update role with menu access
      await rolesRepository.update({
        filter: { name: 'admin' },
        values: {
          menuUiSchemas: menuUids,
        },
      });
    }
  }

  async afterEnable() {
    // After plugin is enabled
  }

  async afterDisable() {
    // After plugin is disabled
    this.client?.disconnect();
  }

  async remove() {
    // Plugin removal
    this.client?.disconnect();
  }
}

export default PluginAgentGateway;
