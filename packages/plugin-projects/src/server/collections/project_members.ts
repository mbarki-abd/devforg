import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'project_members',
  title: 'Project Members',
  fields: [
    {
      type: 'uuid',
      name: 'id',
      primaryKey: true,
    },
    {
      type: 'belongsTo',
      name: 'project',
      target: 'projects',
      foreignKey: 'projectId',
    },
    {
      type: 'belongsTo',
      name: 'user',
      target: 'users',
      foreignKey: 'userId',
    },
    {
      type: 'string',
      name: 'role',
      defaultValue: 'developer',
      interface: 'select',
      uiSchema: {
        title: 'Role',
        'x-component': 'Select',
        enum: [
          { value: 'owner', label: 'Owner' },
          { value: 'admin', label: 'Admin' },
          { value: 'developer', label: 'Developer' },
          { value: 'viewer', label: 'Viewer' },
        ],
      },
    },
    {
      type: 'date',
      name: 'joinedAt',
      defaultValue: () => new Date(),
      interface: 'datetime',
      uiSchema: {
        title: 'Joined At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
  ],
  timestamps: true,
} as CollectionOptions;
