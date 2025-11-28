import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'workflow_runs',
  title: 'Workflow Runs',
  fields: [
    {
      type: 'uuid',
      name: 'id',
      primaryKey: true,
    },
    {
      type: 'belongsTo',
      name: 'workflow',
      target: 'devforge_workflows',
      foreignKey: 'workflowId',
      interface: 'linkTo',
      uiSchema: {
        title: 'Workflow',
        'x-component': 'AssociationField',
      },
    },
    {
      type: 'string',
      name: 'status',
      defaultValue: 'pending',
      interface: 'select',
      uiSchema: {
        title: 'Status',
        'x-component': 'Select',
        enum: [
          { value: 'pending', label: 'Pending' },
          { value: 'running', label: 'Running' },
          { value: 'completed', label: 'Completed' },
          { value: 'failed', label: 'Failed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    },
    {
      type: 'json',
      name: 'variables',
      defaultValue: {},
      interface: 'json',
      uiSchema: {
        title: 'Variables',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'json',
      name: 'logs',
      defaultValue: [],
      interface: 'json',
      uiSchema: {
        title: 'Logs',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'text',
      name: 'error',
      interface: 'textarea',
      uiSchema: {
        title: 'Error',
        'x-component': 'Input.TextArea',
      },
    },
    {
      type: 'integer',
      name: 'currentStep',
      defaultValue: 0,
      interface: 'number',
      uiSchema: {
        title: 'Current Step',
        'x-component': 'InputNumber',
      },
    },
    {
      type: 'belongsTo',
      name: 'triggeredBy',
      target: 'users',
      foreignKey: 'triggeredById',
    },
    {
      type: 'date',
      name: 'startedAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Started At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'date',
      name: 'finishedAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Finished At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'integer',
      name: 'duration',
      interface: 'number',
      uiSchema: {
        title: 'Duration (ms)',
        'x-component': 'InputNumber',
      },
    },
  ],
  timestamps: true,
} as CollectionOptions;
