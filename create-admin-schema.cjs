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
  console.log('=== Creating Admin Layout Schema ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // First, let's check if nocobase-admin exists in the database directly
  console.log('=== Checking UI Schemas in Database ===');
  const allSchemas = await request('GET', '/api/uiSchemas:list?paginate=false', null, token);
  const adminSchema = allSchemas.data.data?.find(s => s['x-uid'] === 'nocobase-admin');
  console.log('nocobase-admin in DB:', adminSchema ? 'Found' : 'Not found');
  if (adminSchema) {
    console.log('Schema data:', JSON.stringify(adminSchema, null, 2).slice(0, 500));
  }

  // Let's check for the schema more thoroughly
  console.log('\n=== All Schemas with "admin" in x-uid ===');
  const adminRelated = allSchemas.data.data?.filter(s =>
    s['x-uid']?.toLowerCase().includes('admin') ||
    s['x-uid']?.toLowerCase().includes('nocobase-admin')
  );
  adminRelated?.forEach(s => {
    console.log(`  ${s['x-uid']}: component=${s['x-component'] || 'none'}`);
  });

  // The proper admin schema structure for NocoBase
  // This is based on the standard NocoBase admin layout
  const adminLayoutSchema = {
    'x-uid': 'nocobase-admin',
    'type': 'void',
    'x-component': 'AdminLayout',
    'x-component-props': {},
    'properties': {
      'nocobase-admin-menu': {
        'x-uid': 'nocobase-admin-menu'
      }
    }
  };

  // Try to create or update the admin schema
  console.log('\n=== Creating Admin Layout Schema ===');

  // First try to insert or update
  const insertResp = await request('POST', '/api/uiSchemas:insertOrUpdate', {
    schema: adminLayoutSchema
  }, token);
  console.log('Insert/Update status:', insertResp.status);
  console.log('Response:', JSON.stringify(insertResp.data).slice(0, 500));

  // If that doesn't work, try different approaches
  if (insertResp.status !== 200) {
    console.log('\n=== Trying alternative: patch ===');
    const patchResp = await request('POST', '/api/uiSchemas:patch', {
      'x-uid': 'nocobase-admin',
      schema: adminLayoutSchema
    }, token);
    console.log('Patch status:', patchResp.status);
    console.log('Response:', JSON.stringify(patchResp.data).slice(0, 500));
  }

  // Try creating directly if doesn't exist
  if (insertResp.status !== 200) {
    console.log('\n=== Trying alternative: create ===');
    const createResp = await request('POST', '/api/uiSchemas:create', {
      values: adminLayoutSchema
    }, token);
    console.log('Create status:', createResp.status);
    console.log('Response:', JSON.stringify(createResp.data).slice(0, 500));
  }

  // Verify
  console.log('\n=== Verification ===');
  const verifyResp = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('Admin schema after update:');
  console.log(JSON.stringify(verifyResp.data, null, 2).slice(0, 1000));

  // Try app restart
  console.log('\n=== Restarting App ===');
  await request('POST', '/api/app:restart', {}, token);
  await new Promise(r => setTimeout(r, 10000));

  // Final check
  const finalCheck = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('\nFinal admin schema:');
  console.log(JSON.stringify(finalCheck.data, null, 2).slice(0, 1000));
}

main().catch(console.error);
