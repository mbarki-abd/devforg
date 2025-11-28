import { Plugin, SchemaComponent } from '@nocobase/client';
import React from 'react';

// Type workaround for React version conflicts
const Schema = SchemaComponent as any;

// Executions Table Schema
const executionsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'executions',
    action: 'list',
    params: {
      pageSize: 20,
      sort: ['-createdAt'],
    },
  },
  'x-component': 'CardItem',
  properties: {
    actions: {
      type: 'void',
      'x-component': 'ActionBar',
      'x-component-props': {
        style: { marginBottom: 16 },
      },
      properties: {
        filter: {
          type: 'void',
          title: 'Filter',
          'x-action': 'filter',
          'x-component': 'Filter.Action',
          'x-component-props': {
            icon: 'FilterOutlined',
          },
        },
        refresh: {
          type: 'void',
          title: 'Refresh',
          'x-action': 'refresh',
          'x-component': 'Action',
          'x-component-props': {
            icon: 'ReloadOutlined',
          },
        },
      },
    },
    table: {
      type: 'array',
      'x-component': 'TableV2',
      'x-component-props': {
        rowKey: 'id',
      },
      properties: {
        id: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Execution ID',
          properties: {
            id: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        agentType: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Agent Type',
          properties: {
            agentType: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        status: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            status: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        startedAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Started At',
          properties: {
            startedAt: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        finishedAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Finished At',
          properties: {
            finishedAt: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        duration: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Duration (ms)',
          properties: {
            duration: {
              type: 'number',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        actions: {
          type: 'void',
          title: 'Actions',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            actions: {
              type: 'void',
              'x-component': 'Space',
              'x-component-props': {
                split: '|',
              },
              properties: {
                view: {
                  type: 'void',
                  title: 'View Logs',
                  'x-component': 'Action.Link',
                },
                cancel: {
                  type: 'void',
                  title: 'Cancel',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Cancel Execution',
                      content: 'Are you sure you want to cancel this execution?',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Execution Logs Table Schema
const executionLogsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'execution_logs',
    action: 'list',
    params: {
      pageSize: 50,
      sort: ['createdAt'],
    },
  },
  'x-component': 'CardItem',
  properties: {
    table: {
      type: 'array',
      'x-component': 'TableV2',
      'x-component-props': {
        rowKey: 'id',
      },
      properties: {
        timestamp: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Timestamp',
          properties: {
            timestamp: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        level: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Level',
          properties: {
            level: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        message: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Message',
          properties: {
            message: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
      },
    },
  },
};

// Executions Page Component
const ExecutionsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Executions</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>
        Monitor and manage agent task executions.
      </p>
      <Schema schema={executionsTableSchema} />
    </div>
  );
};

export class PluginExecutionsClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Register the Executions page route
    this.app.router.add('executions', {
      path: '/admin/executions',
      Component: ExecutionsPage,
    });

    // Add menu item under DevForge
    this.app.pluginSettingsManager.add('devforge.executions', {
      title: 'Executions',
      icon: 'ThunderboltOutlined',
      Component: ExecutionsPage,
    });
  }
}

export default PluginExecutionsClient;
