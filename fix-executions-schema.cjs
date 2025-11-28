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

  // Get executions collection details
  console.log('Checking executions collection schema...');
  const response = await request('GET', '/api/collections:list?filter[name]=executions&appends=fields', null, token);
  console.log('Response:', JSON.stringify(response, null, 2));

  // Update the status field to be a string/select
  console.log('\nUpdating status field...');
  const updateResponse = await request('POST', '/api/collections:setFields/executions', {
    fields: [
      {
        name: 'status',
        type: 'string',
        interface: 'select',
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
      }
    ]
  }, token);

  console.log('Update response:', JSON.stringify(updateResponse, null, 2));

  // Now try adding data again
  console.log('\nCreating sample Executions...');
  const now = new Date();
  const executions = [
    { agentType: 'claude', status: 'completed', startedAt: new Date(now - 3600000).toISOString(), finishedAt: new Date(now - 3500000).toISOString(), duration: 100000 },
    { agentType: 'shell', status: 'completed', startedAt: new Date(now - 7200000).toISOString(), finishedAt: new Date(now - 7100000).toISOString(), duration: 100000 },
    { agentType: 'docker', status: 'failed', startedAt: new Date(now - 10800000).toISOString(), finishedAt: new Date(now - 10750000).toISOString(), duration: 50000 },
    { agentType: 'git', status: 'running', startedAt: new Date(now - 60000).toISOString() }
  ];

  for (const execution of executions) {
    const response = await request('POST', '/api/executions:create', execution, token);
    console.log(`  ${execution.agentType}: ${response.data?.id ? 'Created' : JSON.stringify(response.errors || response)}`);
  }
}

main().catch(console.error);
