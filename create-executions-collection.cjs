const https = require('https');

const API_URL = 'https://devforge.ilinqsoft.com/api';

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log('Authenticating...');
  const authResponse = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = authResponse.data?.token;
  if (!token) {
    console.error('Failed to get token:', authResponse);
    process.exit(1);
  }
  console.log('Token obtained\n');

  // Create executions collection with proper string status field
  console.log('Creating executions collection...');
  const createResponse = await request('POST', '/api/collections:create', {
    name: 'executions',
    title: 'Executions',
    autoGenId: true,
    createdBy: true,
    updatedBy: true,
    createdAt: true,
    updatedAt: true,
    sortable: true,
    fields: [
      {
        name: 'agentType',
        type: 'string',
        interface: 'input',
        uiSchema: {
          title: 'Agent Type',
          type: 'string',
          'x-component': 'Input'
        }
      },
      {
        name: 'status',
        type: 'string',
        interface: 'select',
        defaultValue: 'pending',
        uiSchema: {
          title: 'Status',
          type: 'string',
          'x-component': 'Select',
          enum: [
            { value: 'pending', label: 'Pending' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]
        }
      },
      {
        name: 'parameters',
        type: 'json',
        interface: 'json',
        defaultValue: {},
        uiSchema: {
          title: 'Parameters',
          type: 'object',
          'x-component': 'Input.JSON'
        }
      },
      {
        name: 'result',
        type: 'json',
        interface: 'json',
        defaultValue: {},
        uiSchema: {
          title: 'Result',
          type: 'object',
          'x-component': 'Input.JSON'
        }
      },
      {
        name: 'startedAt',
        type: 'date',
        interface: 'datetime',
        uiSchema: {
          title: 'Started At',
          type: 'string',
          'x-component': 'DatePicker',
          'x-component-props': { showTime: true }
        }
      },
      {
        name: 'finishedAt',
        type: 'date',
        interface: 'datetime',
        uiSchema: {
          title: 'Finished At',
          type: 'string',
          'x-component': 'DatePicker',
          'x-component-props': { showTime: true }
        }
      },
      {
        name: 'duration',
        type: 'integer',
        interface: 'integer',
        uiSchema: {
          title: 'Duration (ms)',
          type: 'number',
          'x-component': 'InputNumber'
        }
      }
    ]
  }, token);

  console.log('Create response:', JSON.stringify(createResponse, null, 2));

  if (createResponse.data?.name === 'executions') {
    console.log('\nExecutions collection created successfully!');

    // Now try adding sample data
    console.log('\nCreating sample Executions...');
    const now = new Date();
    const executions = [
      { agentType: 'claude', status: 'completed', parameters: { prompt: 'Review code' }, result: { success: true }, startedAt: new Date(now - 3600000).toISOString(), finishedAt: new Date(now - 3500000).toISOString(), duration: 100000 },
      { agentType: 'shell', status: 'completed', parameters: { command: 'npm test' }, result: { exitCode: 0 }, startedAt: new Date(now - 7200000).toISOString(), finishedAt: new Date(now - 7100000).toISOString(), duration: 100000 },
      { agentType: 'docker', status: 'failed', parameters: { image: 'node:18' }, result: { error: 'Image not found' }, startedAt: new Date(now - 10800000).toISOString(), finishedAt: new Date(now - 10750000).toISOString(), duration: 50000 },
      { agentType: 'git', status: 'running', parameters: { repo: 'devforge-core', action: 'clone' }, result: {}, startedAt: new Date(now - 60000).toISOString() }
    ];

    for (const execution of executions) {
      const response = await request('POST', '/api/executions:create', execution, token);
      console.log(`  ${execution.agentType}: ${response.data?.id ? 'Created (id: ' + response.data.id + ')' : JSON.stringify(response.errors || response)}`);
    }
  }
}

main().catch(console.error);
