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
  console.log('=== Checking and Fixing Admin Schema ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Get the full raw admin schema
  console.log('=== Full Admin Schema Raw ===');
  const adminRaw = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin?readPretty=false', null, token);
  console.log('Response:', JSON.stringify(adminRaw.data, null, 2).slice(0, 1000));

  // Get the menu schema to understand its structure
  console.log('\n=== Full Menu Schema ===');
  const menuRaw = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu?readPretty=false', null, token);
  console.log('Response:', JSON.stringify(menuRaw.data, null, 2).slice(0, 2000));

  // Check if there's a parent-child relationship issue
  console.log('\n=== Checking UI Schema Storage ===');
  const allSchemas = await request('GET', '/api/uiSchemas:list?paginate=false', null, token);
  console.log('Total UI schemas:', allSchemas.data.data?.length || 0);

  // Find admin-related schemas
  const adminSchemas = allSchemas.data.data?.filter(s =>
    s['x-uid']?.includes('admin') ||
    s['x-uid']?.includes('nocobase') ||
    s.name?.includes('admin')
  );
  console.log('Admin-related schemas found:', adminSchemas?.length || 0);
  adminSchemas?.forEach(s => {
    console.log(`  - x-uid: ${s['x-uid']}, name: ${s.name}, component: ${s['x-component']}`);
  });

  // Try to get the root schema
  console.log('\n=== Getting Root Schema ===');
  const rootSchema = await request('GET', '/api/uiSchemas:getJsonSchema/root', null, token);
  console.log('Root schema:', JSON.stringify(rootSchema.data, null, 2).slice(0, 1000));

  // Try the admin schema with different parameters
  console.log('\n=== Trying Different Admin Endpoints ===');
  const endpoints = [
    '/api/uiSchemas:getJsonSchema/nocobase-admin',
    '/api/uiSchemas:getTree?uid=nocobase-admin',
    '/api/uiSchemas:get/nocobase-admin',
    '/api/uiSchemas:getProperties/nocobase-admin'
  ];

  for (const endpoint of endpoints) {
    const resp = await request('GET', endpoint, null, token);
    console.log(`\n${endpoint}:`);
    console.log('  Status:', resp.status);
    if (resp.status === 200) {
      console.log('  Data keys:', Object.keys(resp.data.data || resp.data || {}).slice(0, 10));
    }
  }

  // Check if the admin schema needs to be created/initialized
  console.log('\n=== Check if Admin Schema Needs Init ===');
  const schemaByUid = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  const schemaData = schemaByUid.data.data || {};

  if (!schemaData['x-component'] && Object.keys(schemaData).length === 0) {
    console.log('Admin schema is EMPTY - needs initialization!');

    // Try to trigger app restart to reinitialize schemas
    console.log('\nAttempting app restart to reinitialize...');
    const restart = await request('POST', '/api/app:restart', {}, token);
    console.log('Restart status:', restart.status);

    // Wait a bit
    await new Promise(r => setTimeout(r, 5000));

    // Check again
    const afterRestart = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
    console.log('After restart:', JSON.stringify(afterRestart.data, null, 2).slice(0, 500));
  } else {
    console.log('Admin schema exists with component:', schemaData['x-component']);
  }
}

main().catch(console.error);
