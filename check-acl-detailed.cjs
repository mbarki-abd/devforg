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
  // Login
  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  console.log('=== Role Check (what ACL returns for current user) ===');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Role name:', roleCheck.data.data?.role?.name);
  console.log('allowAll:', roleCheck.data.data?.allowAll);
  console.log('allowConfigure:', roleCheck.data.data?.allowConfigure);
  console.log('desktopRoutes count:', roleCheck.data.data?.desktopRoutes?.length || 0);
  console.log('menuUiSchemas count:', roleCheck.data.data?.menuUiSchemas?.length || 0);
  console.log('allowMenuItemIds count:', roleCheck.data.data?.allowMenuItemIds?.length || 0);

  if (roleCheck.data.data?.menuUiSchemas?.length > 0) {
    console.log('\nmenuUiSchemas:', roleCheck.data.data.menuUiSchemas.slice(0, 10));
  }

  if (roleCheck.data.data?.allowMenuItemIds?.length > 0) {
    console.log('\nallowMenuItemIds:', roleCheck.data.data.allowMenuItemIds.slice(0, 10));
  }

  console.log('\n=== Check rolesUiSchemas association table ===');
  const roleSchemas = await request('GET', '/api/rolesUiSchemas:list?paginate=false&filter[roleName]=root', null, token);
  console.log('Root role UI schema associations:', roleSchemas.data.data?.length || 0);

  const adminSchemas = await request('GET', '/api/rolesUiSchemas:list?paginate=false&filter[roleName]=admin', null, token);
  console.log('Admin role UI schema associations:', adminSchemas.data.data?.length || 0);

  console.log('\n=== Check user roles ===');
  const user = await request('GET', '/api/auth:check', null, token);
  console.log('User:', user.data.data?.nickname);
  console.log('Roles:', user.data.data?.roles?.map(r => r.name));

  console.log('\n=== Desktop routes with schemaUid ===');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false&appends=uiSchema', null, token);
  routes.data.data?.forEach(r => {
    console.log(`  ${r.title}: id=${r.id}, schemaUid=${r.schemaUid || 'none'}, type=${r.type}`);
  });
}

main().catch(console.error);
