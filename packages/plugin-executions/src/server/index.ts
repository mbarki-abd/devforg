import { Plugin } from '@nocobase/server';
import path from 'path';

export class PluginExecutions extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Load collections
    await this.db.import({
      directory: path.resolve(__dirname, 'collections'),
    });

    // Register ACL resources
    this.app.acl.registerSnippet({
      name: `pm.${this.name}`,
      actions: ['executions:*', 'execution_logs:*'],
    });

    this.app.logger.info('Executions plugin loaded');
  }

  async install() {
    // Sync database schema
    await this.db.sync();
    this.app.logger.info('Executions plugin installed');
  }

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginExecutions;
