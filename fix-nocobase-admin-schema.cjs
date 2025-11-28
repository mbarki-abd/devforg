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
  console.log('=== Fixing NocoBase Admin Schema ===\n');

  // 1. Login
  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed:', auth.data);
    return;
  }
  console.log('✓ Authentication successful\n');

  // 2. Check the current nocobase-admin schema
  console.log('=== Checking Current Admin Schema ===');
  const adminSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('Current admin schema status:', adminSchema.status);
  console.log('Current admin schema data:', JSON.stringify(adminSchema.data).slice(0, 300));

  const schemaData = adminSchema.data.data || {};
  const isEmpty = Object.keys(schemaData).length === 0;
  console.log('Admin schema is empty:', isEmpty);

  // 3. Check if nocobase-admin exists in ui_schemas table
  console.log('\n=== Checking UI Schemas Table ===');
  const allSchemas = await request('GET', '/api/uiSchemas:list?paginate=false&filter={"$or":[{"x-uid":"nocobase-admin"},{"x-uid":"nocobase-admin-menu"}]}', null, token);
  console.log('Schemas found:', allSchemas.data.data?.length || 0);
  allSchemas.data.data?.forEach(s => {
    console.log(`  - x-uid: ${s['x-uid']}, component: ${s['x-component']}`);
  });

  // 4. Check what desktop routes use as schemaUid
  console.log('\n=== Checking Desktop Routes Schema UIDs ===');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  routes.data.data?.forEach(r => {
    console.log(`  - ${r.title}: schemaUid=${r.schemaUid || 'none'}, menuSchemaUid=${r.menuSchemaUid || 'none'}`);
  });

  // 5. Try to reinstall the client plugin
  console.log('\n=== Attempting Client Plugin Reinstall ===');

  // First disable it
  console.log('Disabling client plugin...');
  const disableResp = await request('POST', '/api/pm:disable/client', {}, token);
  console.log('Disable status:', disableResp.status);

  // Wait a moment
  await new Promise(r => setTimeout(r, 2000));

  // Re-enable it
  console.log('Re-enabling client plugin...');
  const enableResp = await request('POST', '/api/pm:enable/client', {}, token);
  console.log('Enable status:', enableResp.status);

  // Wait for it to process
  await new Promise(r => setTimeout(r, 3000));

  // 6. Check if we can trigger schema initialization via upgrade
  console.log('\n=== Triggering App Upgrade ===');
  const upgradeResp = await request('POST', '/api/app:upgrade', {}, token);
  console.log('Upgrade status:', upgradeResp.status);

  // Wait for upgrade
  await new Promise(r => setTimeout(r, 5000));

  // 7. Restart the app
  console.log('\n=== Restarting App ===');
  const restartResp = await request('POST', '/api/app:restart', {}, token);
  console.log('Restart status:', restartResp.status);

  // Wait for restart
  console.log('Waiting for restart...');
  await new Promise(r => setTimeout(r, 15000));

  // 8. Login again and verify
  console.log('\n=== Verifying After Restart ===');
  const auth2 = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });
  const token2 = auth2.data.data?.token;

  if (token2) {
    const adminSchemaAfter = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token2);
    console.log('Admin schema after fix:');
    console.log('  Status:', adminSchemaAfter.status);
    console.log('  Data:', JSON.stringify(adminSchemaAfter.data.data || {}).slice(0, 500));

    const isEmptyAfter = Object.keys(adminSchemaAfter.data.data || {}).length === 0;
    console.log('  Still empty:', isEmptyAfter);

    // Check role permissions again
    const roleCheck = await request('GET', '/api/roles:check', null, token2);
    console.log('\n=== Role Check After Fix ===');
    console.log('Role:', roleCheck.data.data?.role?.name);
    console.log('allowAll:', roleCheck.data.data?.allowAll);
    console.log('desktopRoutes count:', roleCheck.data.data?.desktopRoutes?.length || 0);
    console.log('menuUiSchemas count:', roleCheck.data.data?.menuUiSchemas?.length || 0);
  } else {
    console.log('Could not authenticate after restart');
  }

  console.log('\n=== Fix Attempt Complete ===');
  console.log('Please test the UI now at https://devforge.ilinqsoft.com/admin');
}

main().catch(console.error);
