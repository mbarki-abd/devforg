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
  console.log('Token obtained:', token.substring(0, 20) + '...\n');

  // Sample Projects
  console.log('Creating sample Projects...');
  const projects = [
    { name: 'DevForge Core', slug: 'devforge-core', description: 'Core DevForge platform', repositoryUrl: 'https://github.com/ilinqsoft/devforge-core', branch: 'main', status: 'active' },
    { name: 'API Gateway', slug: 'api-gateway', description: 'API Gateway service', repositoryUrl: 'https://github.com/ilinqsoft/api-gateway', branch: 'main', status: 'active' },
    { name: 'Dashboard UI', slug: 'dashboard-ui', description: 'Web dashboard frontend', repositoryUrl: 'https://github.com/ilinqsoft/dashboard-ui', branch: 'develop', status: 'active' }
  ];

  for (const project of projects) {
    const response = await request('POST', '/api/projects:create', project, token);
    console.log(`  - ${project.name}: ${response.data?.id ? 'Created' : JSON.stringify(response.errors || 'Error')}`);
  }

  // Sample Agents
  console.log('\nCreating sample Agents...');
  const agents = [
    { name: 'Claude AI Agent', type: 'claude', status: 'online', endpoint: 'https://api.anthropic.com', lastHealthCheck: new Date().toISOString() },
    { name: 'Shell Executor', type: 'shell', status: 'online', endpoint: 'local', lastHealthCheck: new Date().toISOString() },
    { name: 'Docker Agent', type: 'docker', status: 'offline', endpoint: 'unix:///var/run/docker.sock', lastHealthCheck: null },
    { name: 'Git Agent', type: 'git', status: 'online', endpoint: 'local', lastHealthCheck: new Date().toISOString() },
    { name: 'Azure DevOps', type: 'azure', status: 'offline', endpoint: 'https://dev.azure.com', lastHealthCheck: null }
  ];

  for (const agent of agents) {
    const response = await request('POST', '/api/agents:create', agent, token);
    console.log(`  - ${agent.name}: ${response.data?.id ? 'Created' : JSON.stringify(response.errors || 'Error')}`);
  }

  // Sample Workflows
  console.log('\nCreating sample Workflows...');
  const workflows = [
    { name: 'CI/CD Pipeline', description: 'Automated build and deploy', trigger: 'webhook', triggerConfig: { url: '/webhook/ci' }, steps: [], enabled: true },
    { name: 'Code Review', description: 'AI-powered code review', trigger: 'event', triggerConfig: { event: 'pull_request' }, steps: [], enabled: true },
    { name: 'Nightly Tests', description: 'Run test suite every night', trigger: 'schedule', triggerConfig: { cron: '0 2 * * *' }, steps: [], enabled: false },
    { name: 'Security Scan', description: 'Weekly security audit', trigger: 'schedule', triggerConfig: { cron: '0 0 * * 0' }, steps: [], enabled: true }
  ];

  for (const workflow of workflows) {
    const response = await request('POST', '/api/devforge_workflows:create', workflow, token);
    console.log(`  - ${workflow.name}: ${response.data?.id ? 'Created' : JSON.stringify(response.errors || 'Error')}`);
  }

  // Sample Credentials
  console.log('\nCreating sample Credentials...');
  const credentials = [
    { name: 'GitHub Token', type: 'api_key', description: 'GitHub Personal Access Token', expiresAt: '2025-12-31T00:00:00Z' },
    { name: 'Azure Service Principal', type: 'azure', description: 'Azure DevOps connection', expiresAt: '2026-01-15T00:00:00Z' },
    { name: 'Docker Hub', type: 'docker', description: 'Docker registry credentials', expiresAt: null },
    { name: 'Claude API Key', type: 'api_key', description: 'Anthropic Claude API', expiresAt: null }
  ];

  for (const credential of credentials) {
    const response = await request('POST', '/api/credentials:create', credential, token);
    console.log(`  - ${credential.name}: ${response.data?.id ? 'Created' : JSON.stringify(response.errors || 'Error')}`);
  }

  // Sample Executions
  console.log('\nCreating sample Executions...');
  const now = new Date();
  const executions = [
    { agentType: 'claude', status: 'completed', parameters: { prompt: 'Review code' }, result: { success: true }, startedAt: new Date(now - 3600000).toISOString(), finishedAt: new Date(now - 3500000).toISOString(), duration: 100000 },
    { agentType: 'shell', status: 'completed', parameters: { command: 'npm test' }, result: { exitCode: 0 }, startedAt: new Date(now - 7200000).toISOString(), finishedAt: new Date(now - 7100000).toISOString(), duration: 100000 },
    { agentType: 'docker', status: 'failed', parameters: { image: 'node:18' }, result: { error: 'Image not found' }, startedAt: new Date(now - 10800000).toISOString(), finishedAt: new Date(now - 10750000).toISOString(), duration: 50000 },
    { agentType: 'git', status: 'running', parameters: { repo: 'devforge-core', action: 'clone' }, result: {}, startedAt: new Date(now - 60000).toISOString(), finishedAt: null, duration: null }
  ];

  for (const execution of executions) {
    const response = await request('POST', '/api/executions:create', execution, token);
    console.log(`  - ${execution.agentType} (${execution.status}): ${response.data?.id ? 'Created' : JSON.stringify(response.errors || 'Error')}`);
  }

  console.log('\n==========================================');
  console.log('Sample data created!');
  console.log('==========================================');
  console.log('Visit: https://devforge.ilinqsoft.com');
  console.log('Login: admin@nocobase.com / admin123');
}

main().catch(console.error);
