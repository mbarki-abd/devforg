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
  console.log('Authenticating...');
  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data?.token;
  if (!token) {
    console.error('Failed to get token:', auth);
    process.exit(1);
  }

  // Check current user's role check (what ACL returns)
  console.log('\n=== ACL Role Check ===');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Current role:', roleCheck.data?.role?.name);
  console.log('allowAll:', roleCheck.data?.allowAll);
  console.log('allowConfigure:', roleCheck.data?.allowConfigure);
  console.log('Desktop routes count:', roleCheck.data?.desktopRoutes?.length || 0);
  console.log('Menu UI schemas count:', roleCheck.data?.menuUiSchemas?.length || 0);

  if (roleCheck.data?.desktopRoutes) {
    console.log('Desktop route IDs:', roleCheck.data.desktopRoutes);
  }
  if (roleCheck.data?.menuUiSchemas) {
    console.log('Menu UI schemas:', roleCheck.data.menuUiSchemas);
  }

  // Check the admin menu schema content
  console.log('\n=== Admin Menu Schema ===');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  if (menuSchema.data) {
    console.log('Menu properties:', Object.keys(menuSchema.data.properties || {}));
  }

  // Check current user info
  console.log('\n=== Current User ===');
  const currentUser = await request('GET', '/api/auth:check', null, token);
  console.log('User:', currentUser.data?.nickname, '- Roles:', currentUser.data?.roles?.map(r => r.name));

  // Check accessible routes
  console.log('\n=== Accessible Routes ===');
  const accessibleRoutes = await request('GET', '/api/desktopRoutes:listAccessible', null, token);
  console.log('Accessible routes:', accessibleRoutes.data?.length || 0);
  if (accessibleRoutes.data) {
    accessibleRoutes.data.forEach(r => console.log('  -', r.title, '[type:', r.type, ']'));
  }

  // Check rolesDesktopRoutes table
  console.log('\n=== Roles Desktop Routes ===');
  const rolesRoutes = await request('GET', '/api/rolesDesktopRoutes:list?paginate=false', null, token);
  console.log('Role-Route associations:', rolesRoutes.data?.length || 0);
  if (rolesRoutes.data && rolesRoutes.data.length > 0) {
    rolesRoutes.data.slice(0, 10).forEach(r => console.log('  -', r.roleName, '->', r.desktopRouteId));
  }

  // Check rolesUiSchemas table
  console.log('\n=== Roles UI Schemas ===');
  const rolesSchemas = await request('GET', '/api/rolesUiSchemas:list?paginate=false', null, token);
  console.log('Role-Schema associations:', rolesSchemas.data?.length || 0);
  if (rolesSchemas.data && rolesSchemas.data.length > 0) {
    rolesSchemas.data.slice(0, 10).forEach(r => console.log('  -', r.roleName, '->', r.uiSchemaXUid));
  }
}

main().catch(console.error);
