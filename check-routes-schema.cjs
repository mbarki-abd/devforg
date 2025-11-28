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
  console.log('=== Checking Routes and Schema Relationship ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Get accessible routes
  console.log('=== Desktop Routes List Accessible ===');
  const routes = await request('GET', '/api/desktopRoutes:listAccessible?tree=true&sort=sort', null, token);
  console.log('Routes:', JSON.stringify(routes.data.data, null, 2));

  // Check if routes have schemaUid
  console.log('\n=== Route Schema UIDs ===');
  function extractSchemaUids(routes, indent = '') {
    for (const route of routes) {
      console.log(`${indent}${route.title}: schemaUid=${route.schemaUid || 'none'}, menuSchemaUid=${route.menuSchemaUid || 'none'}`);
      if (route.children?.length) {
        extractSchemaUids(route.children, indent + '  ');
      }
    }
  }
  extractSchemaUids(routes.data.data || []);

  // Check if the menuSchemaUid can be fetched
  console.log('\n=== Fetching Menu Schema ===');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  console.log('Status:', menuSchema.status);
  console.log('Menu schema exists:', !!menuSchema.data.data && Object.keys(menuSchema.data.data).length > 0);
  if (menuSchema.data.data) {
    console.log('Menu component:', menuSchema.data.data['x-component']);
    console.log('Menu properties:', Object.keys(menuSchema.data.data.properties || {}));
  }

  // Check if the route's menuSchemaUid points to the right schema
  const adminRoute = routes.data.data?.find(r => r.title === 'Admin');
  if (adminRoute) {
    console.log('\n=== Admin Route Details ===');
    console.log('Admin menuSchemaUid:', adminRoute.menuSchemaUid);

    // Try to fetch the admin route's menu schema
    if (adminRoute.menuSchemaUid) {
      const adminMenuSchema = await request('GET', `/api/uiSchemas:getJsonSchema/${adminRoute.menuSchemaUid}`, null, token);
      console.log('Admin menu schema status:', adminMenuSchema.status);
      console.log('Admin menu schema:', JSON.stringify(adminMenuSchema.data).slice(0, 500));
    }
  }

  // Check if there's a specific route-to-schema mapping issue
  console.log('\n=== Checking Route-Schema Mapping ===');
  const dashboardRoute = routes.data.data?.find(r => r.title === 'Admin')?.children?.find(r => r.title === 'Dashboard');
  if (dashboardRoute) {
    console.log('Dashboard route:', JSON.stringify(dashboardRoute, null, 2));

    if (dashboardRoute.schemaUid) {
      const dashboardSchema = await request('GET', `/api/uiSchemas:getJsonSchema/${dashboardRoute.schemaUid}`, null, token);
      console.log('Dashboard schema status:', dashboardSchema.status);
      console.log('Dashboard schema:', JSON.stringify(dashboardSchema.data).slice(0, 500));
    }
  }

  // Check what the client is supposed to render
  console.log('\n=== Checking App Info ===');
  const appInfo = await request('GET', '/api/app:getInfo', null, token);
  console.log('App version:', appInfo.data.data?.version);

  // Check system settings for any menu config
  const sysSettings = await request('GET', '/api/systemSettings:get', null, token);
  console.log('\n=== System Settings ===');
  console.log('System settings keys:', Object.keys(sysSettings.data.data || {}));
}

main().catch(console.error);
