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
  console.log('=== Checking Client Routes and Rendering ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Check what the client plugin provides
  console.log('=== Client Plugin Configuration ===');
  const clientPluginInfo = await request('GET', '/api/applicationPlugins:list?paginate=false&filter[name]=client', null, token);
  console.log('Client plugin:', JSON.stringify(clientPluginInfo.data.data?.[0], null, 2));

  // Check admin layout schema
  console.log('\n=== Admin Layout Schema ===');
  const adminLayout = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  console.log('Status:', adminLayout.status);
  if (adminLayout.status === 200) {
    const schema = adminLayout.data.data;
    console.log('Root keys:', Object.keys(schema || {}));
    console.log('x-component:', schema?.['x-component']);
    console.log('properties:', Object.keys(schema?.properties || {}));
  }

  // Check what routes API returns for the client
  console.log('\n=== Routes API Check ===');

  // Check roles API - what does it return for desktop routes
  const rolesCheck = await request('GET', '/api/roles:check', null, token);
  console.log('\nFull roles:check response:');
  console.log('  role:', rolesCheck.data.data?.role);
  console.log('  allowAll:', rolesCheck.data.data?.allowAll);
  console.log('  snippets:', rolesCheck.data.data?.snippets);
  console.log('  desktopRoutes:', rolesCheck.data.data?.desktopRoutes);
  console.log('  menuUiSchemas:', rolesCheck.data.data?.menuUiSchemas);

  // Check if there's a specific API for getting menu data
  console.log('\n=== Menu Data APIs ===');
  const menuEndpoints = [
    '/api/menu:list',
    '/api/menus:list',
    '/api/routes:list',
    '/api/adminMenu:list'
  ];

  for (const endpoint of menuEndpoints) {
    const resp = await request('GET', endpoint, null, token);
    console.log(`  ${endpoint}: ${resp.status}`);
  }

  // Check what UI schemas exist for admin menu
  console.log('\n=== UI Schemas for Admin ===');
  const adminSchemas = [
    'nocobase-admin',
    'nocobase-admin-menu',
    'admin',
    'root'
  ];

  for (const uid of adminSchemas) {
    const resp = await request('GET', `/api/uiSchemas:getJsonSchema/${uid}`, null, token);
    console.log(`  ${uid}: ${resp.status}`);
    if (resp.status === 200 && resp.data.data) {
      console.log(`    component: ${resp.data.data['x-component']}`);
      console.log(`    properties: ${Object.keys(resp.data.data.properties || {}).length}`);
    }
  }

  // Check what the actual root route returns
  console.log('\n=== Root UI Schema ===');
  const rootSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin', null, token);
  if (rootSchema.status === 200) {
    console.log('Full schema structure:');
    function printSchema(schema, indent = '') {
      if (!schema) return;
      console.log(`${indent}x-uid: ${schema['x-uid']}`);
      console.log(`${indent}x-component: ${schema['x-component']}`);
      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          console.log(`${indent}  [${key}]:`);
          printSchema(value, indent + '    ');
        }
      }
    }
    printSchema(rootSchema.data.data);
  }
}

main().catch(console.error);
