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
  console.log('=== Finding Desktop/Routes Plugins ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // List ALL plugins
  const plugins = await request('GET', '/api/pm:list', null, token);
  console.log('Total plugins:', plugins.data.data?.length);

  console.log('\n=== All Plugin Names ===');
  plugins.data.data?.forEach(p => {
    console.log(`  - ${p.name} (${p.packageName}): enabled=${p.enabled}`);
  });

  // Search for any plugin that might handle routes or menus
  console.log('\n=== Plugins containing "route", "menu", or "desktop" ===');
  const routePlugins = plugins.data.data?.filter(p =>
    p.name?.toLowerCase().includes('route') ||
    p.name?.toLowerCase().includes('menu') ||
    p.name?.toLowerCase().includes('desktop') ||
    p.packageName?.toLowerCase().includes('route') ||
    p.packageName?.toLowerCase().includes('menu') ||
    p.packageName?.toLowerCase().includes('desktop')
  );
  console.log('Found:', routePlugins?.length || 0);
  routePlugins?.forEach(p => {
    console.log(`  - ${p.name} (${p.packageName}): enabled=${p.enabled}, installed=${p.installed}`);
  });

  // Check application plugins table directly
  console.log('\n=== Application Plugins Table ===');
  const appPlugins = await request('GET', '/api/applicationPlugins:list?paginate=false', null, token);
  const desktopRelated = appPlugins.data.data?.filter(p =>
    p.name?.toLowerCase().includes('route') ||
    p.name?.toLowerCase().includes('menu') ||
    p.name?.toLowerCase().includes('desktop') ||
    p.packageName?.toLowerCase().includes('route') ||
    p.packageName?.toLowerCase().includes('desktop')
  );
  console.log('Desktop-related in applicationPlugins:', desktopRelated?.length || 0);
  desktopRelated?.forEach(p => {
    console.log(`  - ${p.name}: enabled=${p.enabled}, installed=${p.installed}, packageName=${p.packageName}`);
  });

  // Try to install/enable desktop-routes plugin
  console.log('\n=== Attempting to enable desktop-routes plugin ===');

  // First check what plugins are available from npm/local
  const npmList = await request('GET', '/api/pm:listByNpm', null, token);
  console.log('NPM plugins status:', npmList.status);

  // Check for specific plugin names that might work
  const possibleNames = [
    'desktop-routes',
    'plugin-desktop-routes',
    '@nocobase/plugin-desktop-routes',
    'desktop',
    'plugin-desktop'
  ];

  for (const name of possibleNames) {
    console.log(`\nTrying to check plugin: ${name}`);
    const checkPlugin = await request('GET', `/api/pm:get?name=${name}`, null, token);
    console.log(`  Status: ${checkPlugin.status}`);
    if (checkPlugin.data.data) {
      console.log(`  Found: enabled=${checkPlugin.data.data.enabled}`);
    }
  }

  // Check the client plugin specifically - it might be handling menus
  console.log('\n=== Client Plugin Details ===');
  const clientPlugin = await request('GET', '/api/applicationPlugins:get?filterByTk=client', null, token);
  console.log('Client plugin:', clientPlugin.data.data?.name, 'enabled:', clientPlugin.data.data?.enabled);
}

main().catch(console.error);
