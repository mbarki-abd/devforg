import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'execution_logs',
  title: 'Execution Logs',
  fields: [
    {
      type: 'bigInt',
      name: 'id',
      primaryKey: true,
      autoIncrement: true,
    },
    {
      type: 'belongsTo',
      name: 'execution',
      target: 'executions',
      foreignKey: 'executionId',
    },
    {
      type: 'datetime',
      name: 'timestamp',
      defaultValue: () => new Date(),
    },
    {
      type: 'string',
      name: 'stream',
      interface: 'select',
      uiSchema: {
        enum: [
          { value: 'stdout', label: 'Standard Output' },
          { value: 'stderr', label: 'Standard Error' },
        ],
      },
    },
    {
      type: 'text',
      name: 'data',
    },
  ],
  indexes: [
    {
      fields: ['executionId', 'timestamp'],
    },
  ],
} as CollectionOptions;
