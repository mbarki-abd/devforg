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
  console.log('=== Investigating Desktop Routes Access ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Check all desktop routes with their details
  console.log('1. All desktop routes:');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false&appends=roles,uiSchema', null, token);
  routes.data.data?.forEach(r => {
    console.log(`  - ${r.title} (id: ${r.id}, type: ${r.type})`);
    console.log(`    schemaUid: ${r.schemaUid}`);
    console.log(`    hidden: ${r.hidden}`);
    console.log(`    roles: ${r.roles?.map(role => role.name).join(', ') || 'none'}`);
    console.log(`    options: ${JSON.stringify(r.options || {})}`);
  });

  // Check rolesDesktopRoutes table directly
  console.log('\n2. Roles-DesktopRoutes associations:');
  const associations = await request('GET', '/api/rolesDesktopRoutes:list?paginate=false', null, token);
  console.log('Associations found:', associations.data.data?.length || 0);
  associations.data.data?.forEach(a => console.log(`  - ${a.roleName} -> ${a.desktopRouteId}`));

  // Check available API actions for desktopRoutes
  console.log('\n3. Trying different API patterns to grant access:');

  const routeIds = routes.data.data?.map(r => r.id) || [];
  console.log('Route IDs:', routeIds);

  // Try 1: roles/{role}/desktopRoutes:add (array of objects)
  console.log('\n3a. Using roles/root/desktopRoutes:add with objects...');
  const add1 = await request('POST', '/api/roles/root/desktopRoutes:add',
    routeIds.map(id => ({ id })), token);
  console.log('Status:', add1.status, add1.data?.error?.message || 'OK');

  // Try 2: rolesDesktopRoutes:create
  console.log('\n3b. Using rolesDesktopRoutes:create for each route...');
  for (const routeId of routeIds) {
    const create = await request('POST', '/api/rolesDesktopRoutes:create', {
      roleName: 'root',
      desktopRouteId: routeId
    }, token);
    console.log(`  root -> ${routeId}:`, create.status, create.data?.errors?.[0]?.message || 'OK');
  }

  // Try 3: roles:update with desktopRoutes
  console.log('\n3c. Using roles:update with desktopRoutes...');
  const update = await request('POST', '/api/roles:update?filterByTk=root', {
    desktopRoutes: routeIds.map(id => ({ id }))
  }, token);
  console.log('Update status:', update.status, update.data?.error?.message || 'OK');

  // Try 4: roles/root/desktopRoutes:set with just IDs
  console.log('\n3d. Using roles/root/desktopRoutes:set with just IDs...');
  const set = await request('POST', '/api/roles/root/desktopRoutes:set', routeIds, token);
  console.log('Set status:', set.status, set.data?.error?.message || 'OK');

  // Check root role details
  console.log('\n4. Root role details:');
  const rootRole = await request('GET', '/api/roles:get?filterByTk=root&appends=desktopRoutes,menuUiSchemas', null, token);
  console.log('desktopRoutes:', rootRole.data.data?.desktopRoutes?.length || 0);
  console.log('menuUiSchemas:', rootRole.data.data?.menuUiSchemas?.length || 0);

  // Check current user role check after changes
  console.log('\n5. Role check after changes:');
  const check = await request('GET', '/api/roles:check', null, token);
  console.log('desktopRoutes:', check.data.data?.desktopRoutes?.length || 0);
  console.log('menuUiSchemas:', check.data.data?.menuUiSchemas?.length || 0);
  console.log('allowMenuItemIds:', check.data.data?.allowMenuItemIds?.length || 0);

  // Check accessible routes
  console.log('\n6. Accessible routes:');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible', null, token);
  console.log('Count:', accessible.data.data?.length || 0);
  accessible.data.data?.forEach(r => console.log(`  - ${r.title} (type: ${r.type})`));
}

main().catch(console.error);
