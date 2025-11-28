import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'devforge_workflows',
  title: 'Workflows',
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
        title: 'Workflow Name',
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
      name: 'trigger',
      defaultValue: 'manual',
      interface: 'select',
      uiSchema: {
        title: 'Trigger Type',
        'x-component': 'Select',
        enum: [
          { value: 'manual', label: 'Manual' },
          { value: 'schedule', label: 'Scheduled' },
          { value: 'webhook', label: 'Webhook' },
          { value: 'event', label: 'Event' },
        ],
      },
    },
    {
      type: 'json',
      name: 'triggerConfig',
      defaultValue: {},
      interface: 'json',
      uiSchema: {
        title: 'Trigger Configuration',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'json',
      name: 'steps',
      defaultValue: [],
      interface: 'json',
      uiSchema: {
        title: 'Workflow Steps',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'json',
      name: 'variables',
      defaultValue: {},
      interface: 'json',
      uiSchema: {
        title: 'Default Variables',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'boolean',
      name: 'enabled',
      defaultValue: true,
      interface: 'checkbox',
      uiSchema: {
        title: 'Enabled',
        'x-component': 'Checkbox',
      },
    },
    {
      type: 'belongsTo',
      name: 'project',
      target: 'projects',
      foreignKey: 'projectId',
      interface: 'linkTo',
      uiSchema: {
        title: 'Project',
        'x-component': 'AssociationField',
      },
    },
    {
      type: 'belongsTo',
      name: 'createdBy',
      target: 'users',
      foreignKey: 'createdById',
    },
    {
      type: 'hasMany',
      name: 'runs',
      target: 'workflow_runs',
      foreignKey: 'workflowId',
    },
  ],
  timestamps: true,
} as CollectionOptions;
