import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'executions',
  title: 'Executions',
  fields: [
    {
      type: 'uuid',
      name: 'id',
      primaryKey: true,
    },
    {
      type: 'belongsTo',
      name: 'task',
      target: 'tasks',
    },
    {
      type: 'string',
      name: 'status',
      defaultValue: 'pending',
      interface: 'select',
      uiSchema: {
        enum: [
          { value: 'pending', label: 'Pending' },
          { value: 'queued', label: 'Queued' },
          { value: 'running', label: 'Running' },
          { value: 'completed', label: 'Completed' },
          { value: 'failed', label: 'Failed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
      },
    },
    {
      type: 'string',
      name: 'agentType',
      interface: 'select',
      uiSchema: {
        enum: [
          { value: 'claude', label: 'Claude' },
          { value: 'azure', label: 'Azure CLI' },
          { value: 'gcloud', label: 'Google Cloud' },
          { value: 'ssh', label: 'SSH' },
          { value: 'docker', label: 'Docker' },
          { value: 'shell', label: 'Shell' },
        ],
      },
    },
    {
      type: 'belongsTo',
      name: 'user',
      target: 'users',
    },
    {
      type: 'datetime',
      name: 'startedAt',
    },
    {
      type: 'datetime',
      name: 'completedAt',
    },
    {
      type: 'datetime',
      name: 'cancelledAt',
    },
    {
      type: 'integer',
      name: 'duration',
      comment: 'Duration in milliseconds',
    },
    {
      type: 'integer',
      name: 'exitCode',
    },
    {
      type: 'text',
      name: 'output',
    },
    {
      type: 'text',
      name: 'error',
    },
    {
      type: 'json',
      name: 'artifacts',
    },
    {
      type: 'json',
      name: 'parameters',
    },
    {
      type: 'hasMany',
      name: 'logs',
      target: 'execution_logs',
      foreignKey: 'executionId',
    },
  ],
} as CollectionOptions;
