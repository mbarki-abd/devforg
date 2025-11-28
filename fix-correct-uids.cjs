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
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Recursively extract all x-uid values from schema
function extractUids(obj, uids = [], path = '') {
  if (!obj || typeof obj !== 'object') return uids;

  if (obj['x-uid']) {
    uids.push({
      uid: obj['x-uid'],
      title: obj.title || '',
      component: obj['x-component'] || '',
      path: path
    });
  }

  if (obj.properties) {
    for (const [key, value] of Object.entries(obj.properties)) {
      extractUids(value, uids, path ? `${path}.${key}` : key);
    }
  }

  return uids;
}

async function main() {
  console.log('=== Fix Menu UIDs ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data?.token;
  if (!token) {
    console.error('Failed to get token:', auth);
    process.exit(1);
  }

  // Get full admin menu schema and extract all UIDs
  console.log('1. Extracting all UIDs from nocobase-admin-menu...\n');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  const allUids = extractUids(menuSchema.data);
  console.log('Found UIDs:');
  allUids.forEach(item => {
    console.log(`  ${item.uid}: ${item.title || item.component} (${item.path})`);
  });

  // Get just the top-level menu item UIDs (Dashboard, DevForge submenu items)
  const menuUids = allUids
    .filter(item => item.component === 'Menu.Item' || item.component === 'Menu.SubMenu')
    .map(item => item.uid);

  // Also include the root menu and page UIDs
  const pageUids = allUids
    .filter(item => item.component === 'Page')
    .map(item => item.uid);

  const allMenuUids = ['nocobase-admin-menu', ...menuUids, ...pageUids];

  console.log('\n2. Menu and Page UIDs to grant access:');
  console.log(allMenuUids);

  // Grant access to all roles
  const roles = ['root', 'admin', 'member'];

  console.log('\n3. Adding menu UIDs to roles...\n');
  for (const role of roles) {
    // Use the set action to replace all associations
    const setResp = await request('POST', `/api/roles/${role}/menuUiSchemas:set`, allMenuUids, token);
    console.log(`  ${role}: set status`, setResp.data ? 'OK' : 'Failed');
  }

  // Final verification
  console.log('\n4. Verification...');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('allowMenuItemIds:', roleCheck.data?.allowMenuItemIds?.length || 0);
  console.log('UIDs:', roleCheck.data?.allowMenuItemIds);

  // Check what menuUiSchemas are now linked
  console.log('\n5. Admin role menuUiSchemas:');
  const adminMenus = await request('GET', '/api/roles/admin/menuUiSchemas:list', null, token);
  console.log('Count:', adminMenus.data?.length || 0);
  if (adminMenus.data) {
    adminMenus.data.forEach(m => console.log(`  - ${m['x-uid']}`));
  }
}

main().catch(console.error);
