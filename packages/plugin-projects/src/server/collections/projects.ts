import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'projects',
  title: 'Projects',
  fields: [
    {
      type: 'uuid',
      name: 'id',
      primaryKey: true,
    },
    {
      type: 'string',
      name: 'name',
      required: true,
      interface: 'input',
      uiSchema: {
        title: 'Project Name',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'slug',
      unique: true,
      interface: 'input',
      uiSchema: {
        title: 'Slug',
        'x-component': 'Input',
      },
    },
    {
      type: 'text',
      name: 'description',
      interface: 'textarea',
      uiSchema: {
        title: 'Description',
        'x-component': 'Input.TextArea',
      },
    },
    {
      type: 'string',
      name: 'repositoryUrl',
      interface: 'input',
      uiSchema: {
        title: 'Repository URL',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'branch',
      defaultValue: 'main',
      interface: 'input',
      uiSchema: {
        title: 'Branch',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'status',
      defaultValue: 'active',
      interface: 'select',
      uiSchema: {
        title: 'Status',
        'x-component': 'Select',
        enum: [
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
          { value: 'deploying', label: 'Deploying' },
          { value: 'error', label: 'Error' },
        ],
      },
    },
    {
      type: 'json',
      name: 'environment',
      defaultValue: {},
      interface: 'json',
      uiSchema: {
        title: 'Environment Variables',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'string',
      name: 'localPath',
      interface: 'input',
      uiSchema: {
        title: 'Local Path',
        'x-component': 'Input',
      },
    },
    {
      type: 'belongsTo',
      name: 'owner',
      target: 'users',
      foreignKey: 'ownerId',
      interface: 'linkTo',
      uiSchema: {
        title: 'Owner',
        'x-component': 'AssociationField',
        'x-component-props': {
          multiple: false,
        },
      },
    },
    {
      type: 'hasMany',
      name: 'members',
      target: 'project_members',
      foreignKey: 'projectId',
    },
    {
      type: 'hasMany',
      name: 'executions',
      target: 'executions',
      foreignKey: 'projectId',
    },
    {
      type: 'date',
      name: 'lastDeployedAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Last Deployed',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'date',
      name: 'createdAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Created At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'date',
      name: 'updatedAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Updated At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
  ],
  timestamps: true,
} as CollectionOptions;
