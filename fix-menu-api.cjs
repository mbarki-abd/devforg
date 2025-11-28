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
  console.log('=== Investigating NocoBase APIs ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.error('Failed to get token:', auth);
    process.exit(1);
  }
  console.log('Token obtained\n');

  // List all available APIs by checking roles endpoints
  console.log('1. Checking roles API endpoints...');

  // Get admin role with all associations
  const adminRole = await request('GET', '/api/roles:get?filterByTk=admin&appends=menuUiSchemas,desktopRoutes,resources,snippets', null, token);
  console.log('Admin role response status:', adminRole.status);
  console.log('Admin role keys:', Object.keys(adminRole.data.data || {}));

  if (adminRole.data.data) {
    console.log('  menuUiSchemas:', adminRole.data.data.menuUiSchemas?.length || 0);
    console.log('  desktopRoutes:', adminRole.data.data.desktopRoutes?.length || 0);
  }

  // Try to use roles:setMenuUiSchemas action
  console.log('\n2. Trying roles:setMenuUiSchemas...');
  const menuUids = [
    'nocobase-admin-menu',
    'y7vf14xkris',      // Dashboard
    'obmr4r4ghft',      // Dashboard page
    'devforge-main-menu', // DevForge menu
    '64rzwdc0egw',      // Projects
    'bo7r10yqlp7',      // Agents
    'd1d1akjc1n0',      // Workflows
    '60ec6ji6tb6',      // Credentials
    'hj6out1s4b8'       // Executions
  ];

  const setMenuResp = await request('POST', '/api/roles:setMenuUiSchemas?filterByTk=admin', menuUids, token);
  console.log('setMenuUiSchemas status:', setMenuResp.status);
  console.log('Response:', JSON.stringify(setMenuResp.data).substring(0, 200));

  // Try add action instead
  console.log('\n3. Trying roles:add for menuUiSchemas...');
  const addMenuResp = await request('POST', '/api/roles/admin/menuUiSchemas:add', menuUids.map(uid => ({ 'x-uid': uid })), token);
  console.log('add menuUiSchemas status:', addMenuResp.status);
  console.log('Response:', JSON.stringify(addMenuResp.data).substring(0, 200));

  // Try set action
  console.log('\n4. Trying roles/admin/menuUiSchemas:set...');
  const setResp = await request('POST', '/api/roles/admin/menuUiSchemas:set', menuUids.map(uid => ({ 'x-uid': uid })), token);
  console.log('set status:', setResp.status);
  console.log('Response:', JSON.stringify(setResp.data).substring(0, 200));

  // Try update with association
  console.log('\n5. Trying roles:update with menuUiSchemas array...');
  const updateResp = await request('POST', '/api/roles:update?filterByTk=admin', {
    menuUiSchemas: menuUids.map(uid => ({ 'x-uid': uid }))
  }, token);
  console.log('update status:', updateResp.status);
  console.log('Response:', JSON.stringify(updateResp.data).substring(0, 200));

  // Check if there's an ACL specific API
  console.log('\n6. Trying acl:setMenuPermissions...');
  const aclResp = await request('POST', '/api/roles/admin:setMenuPermissions', {
    menuUiSchemas: menuUids
  }, token);
  console.log('setMenuPermissions status:', aclResp.status);
  console.log('Response:', JSON.stringify(aclResp.data).substring(0, 200));

  // Final verification
  console.log('\n7. Final verification...');
  const finalCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Menu UI schemas in check:', finalCheck.data.data?.menuUiSchemas?.length || 0);
  console.log('Desktop routes in check:', finalCheck.data.data?.desktopRoutes?.length || 0);
}

main().catch(console.error);
