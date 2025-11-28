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

async function main() {
  console.log('=== Fixing ACL Permissions ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data?.token;
  if (!token) {
    console.error('Failed to get token:', auth);
    process.exit(1);
  }
  console.log('Token obtained');

  // Get all menu UI schemas
  console.log('\n1. Getting all UI schemas from admin menu...');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  const menuUids = [];
  if (menuSchema.data?.properties) {
    for (const [key, value] of Object.entries(menuSchema.data.properties)) {
      const uid = value['x-uid'];
      if (uid) {
        menuUids.push(uid);
        console.log(`  Found: ${value.title || key} (${uid})`);

        // Also get children
        if (value.properties) {
          for (const [childKey, childValue] of Object.entries(value.properties)) {
            const childUid = childValue['x-uid'];
            if (childUid) {
              menuUids.push(childUid);
              console.log(`    Child: ${childValue.title || childKey} (${childUid})`);
            }
          }
        }
      }
    }
  }

  // Add root menu uid
  menuUids.push('nocobase-admin-menu');
  console.log(`\nTotal UIDs found: ${menuUids.length}`);

  // Get all desktop routes
  console.log('\n2. Getting desktop routes...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  const routeIds = routes.data?.map(r => r.id) || [];
  console.log(`Routes found: ${routeIds.length}`);
  routes.data?.forEach(r => console.log(`  - ${r.title} (${r.id})`));

  // Grant access to roles
  const roles = ['root', 'admin', 'member'];

  console.log('\n3. Granting UI schema access to roles...');
  for (const roleName of roles) {
    console.log(`\nProcessing role: ${roleName}`);

    // Create rolesUiSchemas entries for each menu UID
    for (const uid of menuUids) {
      const createResp = await request('POST', '/api/rolesUiSchemas:create', {
        roleName: roleName,
        uiSchemaXUid: uid
      }, token);

      if (createResp.data) {
        console.log(`  + Linked ${uid} to ${roleName}`);
      } else if (createResp.errors?.[0]?.message?.includes('unique')) {
        console.log(`  = ${uid} already linked to ${roleName}`);
      } else {
        console.log(`  - Failed: ${uid} -> ${createResp.errors?.[0]?.message || 'unknown'}`);
      }
    }
  }

  // Update role with menuUiSchemas
  console.log('\n4. Updating roles with menuUiSchemas...');
  for (const roleName of roles) {
    const updateResp = await request('POST', `/api/roles:update?filterByTk=${roleName}`, {
      menuUiSchemas: menuUids
    }, token);
    console.log(`  ${roleName}: ${updateResp.data !== undefined ? 'OK' : 'Failed'}`);
  }

  // Verify
  console.log('\n5. Verifying...');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Desktop routes in check:', roleCheck.data?.desktopRoutes?.length || 0);
  console.log('Menu UI schemas in check:', roleCheck.data?.menuUiSchemas?.length || 0);

  const accessibleRoutes = await request('GET', '/api/desktopRoutes:listAccessible', null, token);
  console.log('Accessible routes:', accessibleRoutes.data?.length || 0);
  accessibleRoutes.data?.forEach(r => console.log(`  - ${r.title}`));

  const uiSchemas = await request('GET', '/api/rolesUiSchemas:list?paginate=false', null, token);
  console.log('Total role-schema associations:', uiSchemas.data?.length || 0);

  console.log('\n=== Fix complete! Please refresh the browser ===');
}

main().catch(console.error);
