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
  console.log('=== Fixing Menu Association via NocoBase API ===\n');

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

  // Menu UIDs to grant access to
  const menuUids = [
    'nocobase-admin-menu',
    'y7vf14xkris',       // Dashboard
    'obmr4r4ghft',       // Dashboard page
    'devforge-main-menu', // DevForge menu
    '64rzwdc0egw',       // Projects
    'bo7r10yqlp7',       // Agents
    'd1d1akjc1n0',       // Workflows
    '60ec6ji6tb6',       // Credentials
    'hj6out1s4b8'        // Executions
  ];

  const roles = ['root', 'admin', 'member'];

  // Using the association API pattern: roles/<roleName>/menuUiSchemas:add
  console.log('1. Using roles association API to add menuUiSchemas...\n');

  for (const role of roles) {
    console.log(`Processing role: ${role}`);

    // Try different association API patterns
    // Pattern 1: /api/roles/<roleName>/menuUiSchemas:add
    const addResp1 = await request('POST', `/api/roles/${role}/menuUiSchemas:add`, menuUids.map(uid => ({ 'x-uid': uid })), token);
    console.log(`  Pattern 1 (add with x-uid): ${addResp1.status}`);

    // Pattern 2: Just UIDs as array
    const addResp2 = await request('POST', `/api/roles/${role}/menuUiSchemas:add`, menuUids, token);
    console.log(`  Pattern 2 (add with uids): ${addResp2.status}`);

    // Pattern 3: Using set instead of add
    const setResp = await request('POST', `/api/roles/${role}/menuUiSchemas:set`, menuUids, token);
    console.log(`  Pattern 3 (set): ${setResp.status}`);

    // Pattern 4: Using toggle
    for (const uid of menuUids.slice(0, 2)) {
      const toggleResp = await request('POST', `/api/roles/${role}/menuUiSchemas:toggle`, { values: { 'x-uid': uid } }, token);
      console.log(`  Pattern 4 (toggle ${uid}): ${toggleResp.status} - ${JSON.stringify(toggleResp.data).substring(0, 50)}`);
    }
  }

  // Check what endpoints are available for roles
  console.log('\n2. Discovering roles API endpoints...\n');

  // Try to list available actions
  const listActions = [
    '/api/roles:list',
    '/api/roles/admin:get',
    '/api/roles/admin/menuUiSchemas:list',
  ];

  for (const endpoint of listActions) {
    const resp = await request('GET', endpoint, null, token);
    console.log(`${endpoint}: ${resp.status}`);
    if (resp.status === 200 && resp.data.data) {
      if (Array.isArray(resp.data.data)) {
        console.log(`  Count: ${resp.data.data.length}`);
      } else {
        console.log(`  Keys: ${Object.keys(resp.data.data).slice(0, 5)}`);
      }
    }
  }

  // Check uiSchemas table directly
  console.log('\n3. Checking uiSchemas table...');
  const uiSchemasResp = await request('GET', '/api/uiSchemas:list?filter[x-uid.$in]=' + encodeURIComponent(JSON.stringify(menuUids.slice(0, 3))), null, token);
  console.log(`uiSchemas query: ${uiSchemasResp.status}`);
  if (uiSchemasResp.data.data) {
    console.log(`Found ${uiSchemasResp.data.data.length} schemas`);
    uiSchemasResp.data.data.forEach(s => console.log(`  - ${s['x-uid']}: ${s.title || s['x-component']}`));
  }

  // Final verification
  console.log('\n4. Final verification...');
  const finalCheck = await request('GET', '/api/roles:check', null, token);
  console.log('allowMenuItemIds:', finalCheck.data.data?.allowMenuItemIds?.length || 0);
  console.log('menuUiSchemas:', finalCheck.data.data?.menuUiSchemas?.length || 0);
  if (finalCheck.data.data?.allowMenuItemIds) {
    console.log('Menu IDs:', finalCheck.data.data.allowMenuItemIds);
  }
}

main().catch(console.error);
