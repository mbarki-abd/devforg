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
  console.log('=== Attempting NocoBase Install Repair ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Try to reinstall the client plugin to regenerate schemas
  console.log('=== Attempting to reinstall client plugin ===');

  // First disable then re-enable
  console.log('1. Disabling client plugin...');
  const disableResp = await request('POST', '/api/pm:disable/client', {}, token);
  console.log('Disable status:', disableResp.status);

  await new Promise(r => setTimeout(r, 3000));

  console.log('\n2. Re-enabling client plugin...');
  const enableResp = await request('POST', '/api/pm:enable/client', {}, token);
  console.log('Enable status:', enableResp.status);

  await new Promise(r => setTimeout(r, 5000));

  // Check if schema was created
  console.log('\n3. Checking admin schema...');
  const checkSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('Admin schema status:', checkSchema.status);
  console.log('Schema data:', JSON.stringify(checkSchema.data).slice(0, 300));

  // Try app upgrade command
  console.log('\n=== Trying app:upgrade ===');
  const upgradeResp = await request('POST', '/api/app:upgrade', {}, token);
  console.log('Upgrade status:', upgradeResp.status);
  console.log('Response:', JSON.stringify(upgradeResp.data).slice(0, 300));

  await new Promise(r => setTimeout(r, 10000));

  // Check again
  const afterUpgrade = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('\nAdmin schema after upgrade:', JSON.stringify(afterUpgrade.data).slice(0, 300));

  // Try db:sync
  console.log('\n=== Trying db:sync ===');
  const syncResp = await request('POST', '/api/db:sync', {}, token);
  console.log('Sync status:', syncResp.status);

  // Let's try to create the nocobase-admin schema with the exact x-uid
  console.log('\n=== Trying direct insert with exact x-uid ===');

  const adminSchema = {
    'x-uid': 'nocobase-admin',
    type: 'void',
    name: 'nocobase-admin',
    'x-component': 'AdminLayout',
    'x-component-props': {},
    properties: {
      'nocobase-admin-menu': {
        'x-uid': 'nocobase-admin-menu'
      }
    }
  };

  // Try insertAdjacent at root level
  const insertResp = await request('POST', '/api/uiSchemas:insert', {
    schema: adminSchema,
    wrap: null
  }, token);
  console.log('Insert status:', insertResp.status);
  console.log('Response:', JSON.stringify(insertResp.data).slice(0, 500));

  // Verify
  const finalCheck = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('\nFinal check:', JSON.stringify(finalCheck.data).slice(0, 300));

  // List all schemas one more time to see what exists
  console.log('\n=== All UI Schemas Starting With "nocobase" ===');
  const allSchemas = await request('GET', '/api/uiSchemas:list?paginate=false', null, token);
  const nocobaseSchemas = allSchemas.data.data?.filter(s =>
    s['x-uid']?.startsWith('nocobase')
  );
  console.log('Found:', nocobaseSchemas?.length || 0);
  nocobaseSchemas?.forEach(s => {
    console.log(`  ${s['x-uid']}: component=${s['x-component'] || 'none'}, name=${s.name}`);
  });
}

main().catch(console.error);
