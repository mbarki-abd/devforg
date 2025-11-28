import { Plugin, SchemaComponent } from '@nocobase/client';
import React from 'react';

// Type workaround for React version conflicts
const Schema = SchemaComponent as any;

// Projects Table Schema
const projectsTableSchema = {
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection: 'projects',
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
          title: 'Add New',
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
              title: 'Create Project',
              properties: {
                name: {
                  type: 'string',
                  title: 'Project Name',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  required: true,
                },
                slug: {
                  type: 'string',
                  title: 'Slug',
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
                repositoryUrl: {
                  type: 'string',
                  title: 'Repository URL',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                },
                branch: {
                  type: 'string',
                  title: 'Branch',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  default: 'main',
                },
                status: {
                  type: 'string',
                  title: 'Status',
                  'x-decorator': 'FormItem',
                  'x-component': 'Select',
                  enum: [
                    { value: 'active', label: 'Active' },
                    { value: 'archived', label: 'Archived' },
                    { value: 'pending', label: 'Pending' },
                  ],
                  default: 'active',
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
        slug: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            slug: {
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
        repositoryUrl: {
          type: 'void',
          'x-decorator': 'TableV2.Column.Decorator',
          'x-component': 'TableV2.Column',
          properties: {
            repositoryUrl: {
              type: 'string',
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
                view: {
                  type: 'void',
                  title: 'View',
                  'x-component': 'Action.Link',
                  'x-component-props': {},
                },
                edit: {
                  type: 'void',
                  title: 'Edit',
                  'x-component': 'Action.Link',
                  'x-component-props': {},
                },
                delete: {
                  type: 'void',
                  title: 'Delete',
                  'x-component': 'Action.Link',
                  'x-component-props': {
                    confirm: {
                      title: 'Delete',
                      content: 'Are you sure you want to delete this project?',
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

// Projects Page Component
const ProjectsPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Projects</h1>
      <Schema schema={projectsTableSchema} />
    </div>
  );
};

export class PluginProjectsClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Register the Projects page route
    this.app.router.add('projects', {
      path: '/admin/projects',
      Component: ProjectsPage,
    });

    // Add menu item to the admin menu
    this.app.pluginSettingsManager.add('devforge', {
      title: 'DevForge',
      icon: 'RocketOutlined',
    });

    this.app.pluginSettingsManager.add('devforge.projects', {
      title: 'Projects',
      icon: 'FolderOutlined',
      Component: ProjectsPage,
    });
  }
}

export default PluginProjectsClient;
