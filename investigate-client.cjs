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
  console.log('=== Investigating Client Configuration ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Check what routes the client fetches on load
  console.log('1. Checking /api/desktopRoutes:listAccessible (what client calls)...');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible?tree=true', null, token);
  console.log('Status:', accessible.status);
  console.log('Data structure:', JSON.stringify(accessible.data, null, 2).slice(0, 1500));

  // Check menu schema (older method)
  console.log('\n2. Checking /api/uiSchemas:getJsonSchema/nocobase-admin-menu...');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  console.log('Status:', menuSchema.status);
  console.log('Properties count:', Object.keys(menuSchema.data.data?.properties || {}).length);

  // Check system settings for layout mode
  console.log('\n3. System settings (layout configuration)...');
  const settings = await request('GET', '/api/systemSettings:get/1', null, token);
  console.log('Full settings:', JSON.stringify(settings.data.data || {}, null, 2));

  // Check if there's a desktop-routes plugin configuration
  console.log('\n4. Checking plugin configurations...');
  const pluginConfigs = await request('GET', '/api/pluginSettings:get', null, token);
  console.log('Plugin settings status:', pluginConfigs.status);

  // Check all collections to see desktop routes table structure
  console.log('\n5. Desktop routes table structure...');
  const collections = await request('GET', '/api/collections:list?filter[name]=desktopRoutes', null, token);
  console.log('Collection exists:', collections.data.data?.length > 0);

  // Try the admin route format
  console.log('\n6. Checking admin routes configuration...');
  const adminRoute = await request('GET', '/api/desktopRoutes:get?filter[title]=Admin&appends=children', null, token);
  console.log('Admin route:', JSON.stringify(adminRoute.data.data || {}, null, 2).slice(0, 500));

  // Check if routes have proper hideInMenu flag
  console.log('\n7. Route visibility flags...');
  const allRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  allRoutes.data.data?.forEach(r => {
    console.log(`  ${r.title}: hidden=${r.hidden}, hideInMenu=${r.hideInMenu}, type=${r.type}`);
  });

  // Check if there's a specific client route we need
  console.log('\n8. Checking client plugin registration...');
  const clientInfo = await request('GET', '/api/app:getInfo', null, token);
  console.log('App info status:', clientInfo.status);
  console.log('App info:', JSON.stringify(clientInfo.data || {}).slice(0, 500));
}

main().catch(console.error);
