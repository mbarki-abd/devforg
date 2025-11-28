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

  // Check executions collection schema
  console.log('Checking executions collection...');
  const collectionInfo = await request('GET', '/api/collections:get?filterByTk=executions&appends=fields', null, token);
  console.log('Collection fields:', JSON.stringify(collectionInfo.data?.fields?.map(f => ({ name: f.name, type: f.type })), null, 2));

  // Try creating executions with proper field values
  console.log('\nCreating sample Executions...');
  const now = new Date();
  const executions = [
    { agentType: 'claude', status: 'completed', parameters: { prompt: 'Review code' }, result: { success: true }, startedAt: new Date(now - 3600000).toISOString(), finishedAt: new Date(now - 3500000).toISOString(), duration: 100000 },
    { agentType: 'shell', status: 'completed', parameters: { command: 'npm test' }, result: { exitCode: 0 }, startedAt: new Date(now - 7200000).toISOString(), finishedAt: new Date(now - 7100000).toISOString(), duration: 100000 },
    { agentType: 'docker', status: 'failed', parameters: { image: 'node:18' }, result: { error: 'Image not found' }, startedAt: new Date(now - 10800000).toISOString(), finishedAt: new Date(now - 10750000).toISOString(), duration: 50000 },
    { agentType: 'git', status: 'running', parameters: { repo: 'devforge-core', action: 'clone' }, result: {}, startedAt: new Date(now - 60000).toISOString() }
  ];

  for (const execution of executions) {
    // Remove null/undefined values
    const cleanExecution = {};
    for (const [key, value] of Object.entries(execution)) {
      if (value !== null && value !== undefined) {
        cleanExecution[key] = value;
      }
    }

    console.log(`Creating: ${JSON.stringify(cleanExecution)}`);
    const response = await request('POST', '/api/executions:create', cleanExecution, token);
    console.log(`  Response: ${JSON.stringify(response)}\n`);
  }
}

main().catch(console.error);
