import { CollectionOptions } from '@nocobase/database';

export default {
  name: 'credentials',
  title: 'Credentials',
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
        title: 'Credential Name',
        'x-component': 'Input',
      },
    },
    {
      type: 'string',
      name: 'type',
      required: true,
      interface: 'select',
      uiSchema: {
        title: 'Type',
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
      },
    },
    {
      type: 'text',
      name: 'encryptedValue',
      required: true,
      // This field stores encrypted credential data
      // Never exposed in API responses
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
      type: 'date',
      name: 'rotatedAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Last Rotated',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
    {
      type: 'date',
      name: 'expiresAt',
      interface: 'datetime',
      uiSchema: {
        title: 'Expires At',
        'x-component': 'DatePicker',
        'x-component-props': {
          showTime: true,
        },
      },
    },
  ],
  timestamps: true,
} as CollectionOptions;
