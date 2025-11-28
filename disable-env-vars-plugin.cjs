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
  console.log('=== Disabling Environment Variables Plugin ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Check if environment-variables plugin is enabled
  console.log('1. Checking environment-variables plugin status...');
  const plugins = await request('GET', '/api/pm:list', null, token);
  const envPlugin = plugins.data.data?.find(p => p.name === 'environment-variables');
  console.log('Environment-variables plugin:', envPlugin ? `enabled=${envPlugin.enabled}` : 'Not found');

  if (envPlugin && envPlugin.enabled) {
    console.log('\n2. Disabling environment-variables plugin...');
    const disableResp = await request('POST', '/api/pm:disable/environment-variables', {}, token);
    console.log('Disable response:', disableResp.status);
    console.log('Response:', JSON.stringify(disableResp.data).slice(0, 500));

    // Wait for the app to process
    await new Promise(r => setTimeout(r, 3000));
  }

  // Restart app to clear any cached errors
  console.log('\n3. Restarting app...');
  const restartResp = await request('POST', '/api/app:restart', {}, token);
  console.log('Restart response:', restartResp.status);

  // Wait for restart
  console.log('Waiting for restart...');
  await new Promise(r => setTimeout(r, 10000));

  // Verify
  console.log('\n4. Verifying plugin status after restart...');
  const auth2 = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });
  const token2 = auth2.data.data?.token;

  const plugins2 = await request('GET', '/api/pm:list', null, token2);
  const envPlugin2 = plugins2.data.data?.find(p => p.name === 'environment-variables');
  console.log('Environment-variables after restart:', envPlugin2 ? `enabled=${envPlugin2.enabled}` : 'Not found');

  // Check if there's an environmentVariables API still being called
  console.log('\n5. Testing environmentVariables API...');
  const envVarsResp = await request('GET', '/api/environmentVariables?paginate=false', null, token2);
  console.log('environmentVariables API status:', envVarsResp.status);

  console.log('\n=== Done. Please test the UI now ===');
}

main().catch(console.error);
