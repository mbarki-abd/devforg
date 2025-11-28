import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'agents',
  title: 'Agents',
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
        title: 'Agent Name',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'type',
      required: true,
      interface: 'select',
      uiSchema: {
        title: 'Agent Type',
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
      },
    },
    {
      type: 'string',
      name: 'status',
      defaultValue: 'offline',
      interface: 'select',
      uiSchema: {
        title: 'Status',
        'x-component': 'Select',
        enum: [
          { value: 'online', label: 'Online' },
          { value: 'offline', label: 'Offline' },
          { value: 'busy', label: 'Busy' },
          { value: 'error', label: 'Error' },
        ],
      },
    },
    {
      type: 'string',
      name: 'endpoint',
      interface: 'input',
      uiSchema: {
        title: 'Endpoint URL',
        'x-component': 'Input',
      },
    },
    {
      type: 'json',
      name: 'config',
      defaultValue: {},
      interface: 'json',
      uiSchema: {
        title: 'Configuration',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'json',
      name: 'capabilities',
      defaultValue: [],
      interface: 'json',
      uiSchema: {
        title: 'Capabilities',
        'x-component': 'Input.JSON',
      },
    },
    {
      type: 'date',
      name: 'lastHealthCheck',
      interface: 'datetime',
      uiSchema: {
        title: 'Last Health Check',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'text',
      name: 'lastError',
      interface: 'textarea',
      uiSchema: {
        title: 'Last Error',
        'x-component': 'Input.TextArea',
      },
    },
  ],
  timestamps: true,
} as CollectionOptions;
