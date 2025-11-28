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
  console.log('=== Investigating Menu Rendering ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Check NocoBase version
  console.log('1. Checking application info...');
  const appInfo = await request('GET', '/api/app:getLang?locale=en-US', null, token);
  console.log('App lang response:', appInfo.status);

  // Check system settings
  console.log('\n2. Checking system settings...');
  const settings = await request('GET', '/api/systemSettings:get/1?appends=logo', null, token);
  console.log('System settings:', settings.status);
  if (settings.data.data) {
    console.log('Title:', settings.data.data.title);
    console.log('Options:', JSON.stringify(settings.data.data.options || {}).slice(0, 200));
  }

  // Check the layout mode setting
  console.log('\n3. Checking layout mode...');
  const layoutSettings = await request('GET', '/api/systemSettings:get?appends=*', null, token);
  console.log('Layout settings:', JSON.stringify(layoutSettings.data.data || {}).slice(0, 500));

  // Check the role check response in detail
  console.log('\n4. Role check full response:');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Full roleCheck.data:', JSON.stringify(roleCheck.data.data || {}).slice(0, 1000));

  // Check if there's a specific desktop routes endpoint the client calls
  console.log('\n5. Checking accessible routes tree:');
  const treeRoutes = await request('GET', '/api/desktopRoutes:listAccessible?tree=true&appends=uiSchema', null, token);
  console.log('Status:', treeRoutes.status);
  console.log('Root route:', treeRoutes.data.data?.[0]?.title);
  console.log('Children count:', treeRoutes.data.data?.[0]?.children?.length);

  // Check if it's using mobile routes
  console.log('\n6. Checking mobile routes:');
  const mobileRoutes = await request('GET', '/api/mobileRoutes:list?paginate=false', null, token);
  console.log('Mobile routes:', mobileRoutes.status, mobileRoutes.data.data?.length || 0);

  // Check if it's looking for specific UI schema
  console.log('\n7. Checking main menu schema:');
  const mainMenu = await request('GET', '/api/uiSchemas:getProperties/nocobase-admin-menu', null, token);
  console.log('Main menu properties count:', Object.keys(mainMenu.data.data || {}).length);

  // Check what the application root looks like
  console.log('\n8. Checking application root schema:');
  const rootSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-desktop', null, token);
  console.log('Root schema status:', rootSchema.status);
  console.log('Root schema keys:', Object.keys(rootSchema.data.data || {}));

  // Check plugin-desktop-routes status
  console.log('\n9. Check plugins related to desktop routes:');
  const plugins = await request('GET', '/api/pm:list', null, token);
  const desktopPlugin = plugins.data.data?.find(p => p.name?.includes('desktop') || p.packageName?.includes('desktop'));
  console.log('Desktop routes plugin:', desktopPlugin ? JSON.stringify(desktopPlugin) : 'Not found');

  const clientPlugin = plugins.data.data?.find(p => p.name === 'client' || p.packageName?.includes('plugin-client'));
  console.log('Client plugin:', clientPlugin ? JSON.stringify(clientPlugin) : 'Not found');
}

main().catch(console.error);
