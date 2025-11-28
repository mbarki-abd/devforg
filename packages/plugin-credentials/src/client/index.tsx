import { Plugin, SchemaComponent } from '@nocobase/client';
import React from 'react';

// Type workaround for React version conflicts
const Schema = SchemaComponent as any;

// Credentials Table Schema
const credentialsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'credentials',
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
          title: 'Add Credential',
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
              title: 'Store Credential',
              properties: {
                name: {
                  type: 'string',
                  title: 'Credential Name',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  required: true,
                },
                type: {
                  type: 'string',
                  title: 'Type',
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  enum: [
                    { value: 'api_key', label: 'API Key' },
                    { value: 'oauth2', label: 'OAuth 2.0' },
                    { value: 'ssh', label: 'SSH Key' },
                    { value: 'azure', label: 'Azure Service Principal' },
                    { value: 'gcloud', label: 'Google Cloud Service Account' },
                    { value: 'docker', label: 'Docker Registry' },
                    { value: 'database', label: 'Database Connection' },
                  ],
                  required: true,
                },
                description: {
                  type: 'string',
                  title: 'Description',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                },
                expiresAt: {
                  type: 'string',
                  title: 'Expires At',
                  'x-decorator': 'FormItem',
                  'x-component': 'DatePicker',
                  'x-component-props': {
                    showTime: true,
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
        description: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            description: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        rotatedAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Last Rotated',
          properties: {
            rotatedAt: {
              type: 'string',
              'x-component': 'CollectionField',
              'x-read-pretty': true,
            },
          },
        },
        expiresAt: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          title: 'Expires At',
          properties: {
            expiresAt: {
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
                rotate: {
                  type: 'void',
                  title: 'Rotate',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    type: 'primary',
                  },
                },
                delete: {
                  type: 'void',
                  title: 'Delete',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Delete Credential',
                      content: 'Are you sure you want to delete this credential? This action cannot be undone.',
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

// Credentials Page Component
const CredentialsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Credentials</h1>
      <p style={{ marginBottom: 16, color: '#666' }}>
        Securely store and manage API keys, OAuth tokens, SSH keys, and other sensitive credentials.
      </p>
      <Schema schema={credentialsTableSchema} />
    </div>
  );
};

export class PluginCredentialsClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Register the Credentials page route
    this.app.router.add('credentials', {
      path: '/admin/credentials',
      Component: CredentialsPage,
    });

    // Add menu item under DevForge
    this.app.pluginSettingsManager.add('devforge.credentials', {
      title: 'Credentials',
      icon: 'KeyOutlined',
      Component: CredentialsPage,
    });
  }
}

export default PluginCredentialsClient;
