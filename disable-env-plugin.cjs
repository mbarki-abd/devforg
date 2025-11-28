const https = require('https');

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://devforge.ilinqsoft.com');
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('=== Investigating Environment Variables Plugin ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Find the environment-variables plugin
  console.log('1. Finding environment-variables plugin...');
  const plugins = await request('GET', '/api/pm:list', null, token);
  const envPlugin = plugins.data.data?.find(p =>
    p.name?.includes('environment') ||
    p.packageName?.includes('environment')
  );

  if (envPlugin) {
    console.log('Found:', envPlugin.name, 'enabled:', envPlugin.enabled);

    // Try to disable it
    console.log('\n2. Attempting to disable environment-variables plugin...');
    const disableResp = await request('POST', `/api/pm:disable/${envPlugin.name}`, {}, token);
    console.log('Disable response:', disableResp.status);

    if (disableResp.status === 200) {
      console.log('\n3. Plugin disabled. Waiting for restart...');
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    console.log('Environment variables plugin not found');
  }

  // Check what API the env plugin is trying to access
  console.log('\n4. Checking environmentVariables API...');
  const envVars = await request('GET', '/api/environmentVariables:list', null, token);
  console.log('environmentVariables:list status:', envVars.status);
  console.log('Response:', JSON.stringify(envVars.data).slice(0, 200));

  // Check if there's an unauthenticated endpoint causing issues
  console.log('\n5. Checking unauthenticated access...');
  const noAuthEnv = await request('GET', '/api/environmentVariables:list', null, null);
  console.log('No-auth status:', noAuthEnv.status);

  // Try the app:getClientScopeEnv endpoint
  console.log('\n6. Checking client scope env...');
  const clientEnv = await request('GET', '/api/app:getClientScopeEnv', null, token);
  console.log('Client scope env status:', clientEnv.status);
  console.log('Response:', JSON.stringify(clientEnv.data).slice(0, 200));

  // Check the specific endpoint that's failing (from the error)
  console.log('\n7. Checking what the plugin is calling...');
  const endpoints = [
    '/api/env:list',
    '/api/environmentVariables:list',
    '/api/systemSettings:getEnv',
    '/api/app:getEnv'
  ];

  for (const endpoint of endpoints) {
    const resp = await request('GET', endpoint, null, token);
    console.log(`  ${endpoint}: ${resp.status}`);
  }
}

main().catch(console.error);
