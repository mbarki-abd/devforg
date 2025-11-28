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
  console.log('=== Debug Menu Schema ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data?.token;
  if (!token) {
    console.error('Failed to get token:', auth);
    process.exit(1);
  }

  // Get full admin menu schema
  console.log('1. Full nocobase-admin-menu schema:');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  console.log(JSON.stringify(menuSchema.data, null, 2));

  // Check the application schema
  console.log('\n\n2. Application root schema (nocobase-app):');
  const appSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-app', null, token);
  if (appSchema.data) {
    console.log('x-component:', appSchema.data['x-component']);
    console.log('properties:', Object.keys(appSchema.data.properties || {}));
  } else {
    console.log('Not found or error:', appSchema);
  }

  // Check desktop routes
  console.log('\n\n3. Desktop routes with schema info:');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false&appends=uiSchema', null, token);
  if (routes.data) {
    routes.data.forEach(r => {
      console.log(`\n  Route: ${r.title} (id: ${r.id})`);
      console.log(`    type: ${r.type}`);
      console.log(`    schemaUid: ${r.schemaUid}`);
      console.log(`    parentId: ${r.parentId}`);
      console.log(`    icon: ${r.icon}`);
      if (r.uiSchema) {
        console.log(`    uiSchema.x-component: ${r.uiSchema['x-component']}`);
        console.log(`    uiSchema properties: ${Object.keys(r.uiSchema.properties || {})}`);
      }
    });
  }

  // Check system settings for menu configuration
  console.log('\n\n4. System settings:');
  const settings = await request('GET', '/api/systemSettings:get', null, token);
  console.log('Settings:', JSON.stringify(settings.data, null, 2));

  // Check the actual data on /admin page
  console.log('\n\n5. Admin page components loaded check:');
  const adminSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  if (adminSchema.data) {
    console.log('Admin schema exists');
    console.log('x-component:', adminSchema.data['x-component']);
    console.log('properties:', Object.keys(adminSchema.data.properties || {}));
  } else {
    console.log('No admin schema');
  }

  // Check roles check response
  console.log('\n\n6. Roles check (what frontend receives):');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log(JSON.stringify(roleCheck.data, null, 2));
}

main().catch(console.error);
