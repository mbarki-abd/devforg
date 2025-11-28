import { Plugin, SchemaComponent } from '@nocobase/client';
import React from 'react';

// Type workaround for React version conflicts
const Schema = SchemaComponent as any;

// Agents Table Schema
const agentsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'agents',
    action: 'list',
    params: {
      pageSize: 20,
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
        create: {
          type: 'void',
          title: 'Add Agent',
          'x-action': 'create',
          'x-component': 'Action',
          'x-component-props': {
            type: 'primary',
            icon: 'PlusOutlined',
          },
          properties: {
            drawer: {
              type: 'void',
              'x-component': 'Action.Drawer',
              'x-decorator': 'Form',
              title: 'Register Agent',
              properties: {
                name: {
                  type: 'string',
                  title: 'Agent Name',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  required: true,
                },
                type: {
                  type: 'string',
                  title: 'Agent Type',
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  enum: [
                    { value: 'claude', label: 'Claude AI' },
                    { value: 'shell', label: 'Shell Executor' },
                    { value: 'docker', label: 'Docker Agent' },
                    { value: 'kubernetes', label: 'Kubernetes Agent' },
                    { value: 'azure', label: 'Azure Agent' },
                    { value: 'gcloud', label: 'Google Cloud Agent' },
                    { value: 'git', label: 'Git Agent' },
                    { value: 'npm', label: 'NPM Agent' },
                  ],
                  required: true,
                },
                endpoint: {
                  type: 'string',
                  title: 'Endpoint URL',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  'x-component-props': {
                    placeholder: 'http://localhost:8080',
                  },
                },
                footer: {
                  type: 'void',
                  'x-component': 'Action.Drawer.Footer',
                  properties: {
                    cancel: {
                      title: 'Cancel',
                      'x-component': 'Action',
                      'x-component-props': {
                        useAction: '{{ cm.useCancelAction }}',
                      },
                    },
                    submit: {
                      title: 'Submit',
                      'x-component': 'Action',
                      'x-component-props': {
                        type: 'primary',
                        useAction: '{{ cm.useCreateAction }}',
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
    table: {
      type: 'array',
      'x-component': 'TableV2',
      'x-component-props': {
        rowKey: 'id',
        rowSelection: { type: 'checkbox' },
      },
      properties: {
        name: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            name: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        type: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            type: {
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
        endpoint: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            endpoint: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        lastHealthCheck: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Last Health Check',
          properties: {
            lastHealthCheck: {
              type: 'string',
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
                healthCheck: {
                  type: 'void',
                  title: 'Health Check',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    type: 'primary',
                  },
                },
                edit: {
                  type: 'void',
                  title: 'Edit',
                  'x-component': 'Action.Link',
                },
                delete: {
                  type: 'void',
                  title: 'Delete',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Delete Agent',
                      content: 'Are you sure you want to delete this agent?',
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

// Agents Page Component
const AgentsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Agents</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>
        Manage DevForge agents for executing tasks. Agents can be Claude AI, shell executors, Docker, Kubernetes, or cloud providers.
      </p>
      <Schema schema={agentsTableSchema} />
    </div>
  );
};

export class PluginAgentGatewayClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Register the Agents page route
    this.app.router.add('agents', {
      path: '/admin/agents',
      Component: AgentsPage,
    });

    // Add menu item under DevForge
    this.app.pluginSettingsManager.add('devforge.agents', {
      title: 'Agents',
      icon: 'RobotOutlined',
      Component: AgentsPage,
    });
  }
}

export default PluginAgentGatewayClient;
