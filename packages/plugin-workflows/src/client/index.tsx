import { Plugin, SchemaComponent } from '@nocobase/client';
import React from 'react';

// Type workaround for React version conflicts
const Schema = SchemaComponent as any;

// Workflows Table Schema
const workflowsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'devforge_workflows',
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
          title: 'Add Workflow',
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
              title: 'Create Workflow',
              properties: {
                name: {
                  type: 'string',
                  title: 'Workflow Name',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  required: true,
                },
                description: {
                  type: 'string',
                  title: 'Description',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                },
                trigger: {
                  type: 'string',
                  title: 'Trigger Type',
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  enum: [
                    { value: 'manual', label: 'Manual' },
                    { value: 'schedule', label: 'Scheduled' },
                    { value: 'webhook', label: 'Webhook' },
                    { value: 'event', label: 'Event' },
                  ],
                  default: 'manual',
                },
                enabled: {
                  type: 'boolean',
                  title: 'Enabled',
                  'x-decorator': 'FormItem',
                  'x-component': 'Checkbox',
                  default: true,
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
        trigger: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            trigger: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        enabled: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            enabled: {
              type: 'boolean',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        createdAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            createdAt: {
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
                run: {
                  type: 'void',
                  title: 'Run',
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
                      title: 'Delete',
                      content: 'Are you sure you want to delete this workflow?',
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

// Workflow Runs Table Schema
const workflowRunsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'workflow_runs',
    action: 'list',
    params: {
      pageSize: 20,
      sort: ['-createdAt'],
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
        workflow: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Workflow',
          properties: {
            workflow: {
              type: 'object',
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
        currentStep: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Step',
          properties: {
            currentStep: {
              type: 'number',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        startedAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            startedAt: {
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
      },
    },
  },
};

// Workflows Page Component
const WorkflowsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Workflows</h1>
      <Schema schema={workflowsTableSchema} />
      <h2 style={{ marginTop: 32, marginBottom: 16 }}>Recent Runs</h2>
      <Schema schema={workflowRunsTableSchema} />
    </div>
  );
};

export class PluginWorkflowsClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Register the Workflows page route
    this.app.router.add('workflows', {
      path: '/admin/workflows',
      Component: WorkflowsPage,
    });

    // Add menu item under DevForge
    this.app.pluginSettingsManager.add('devforge.workflows', {
      title: 'Workflows',
      icon: 'BranchesOutlined',
      Component: WorkflowsPage,
    });
  }
}

export default PluginWorkflowsClient;
