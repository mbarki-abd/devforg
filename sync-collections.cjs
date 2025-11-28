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
  console.log('=== Sync and Fix Collections ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // List all plugins
  console.log('1. Finding desktop-routes related plugins...');
  const plugins = await request('GET', '/api/applicationPlugins:list?paginate=false', null, token);

  const desktopPlugins = plugins.data.data?.filter(p =>
    p.name?.includes('desktop') ||
    p.name?.includes('route') ||
    p.packageName?.includes('desktop')
  );

  console.log('Desktop-related plugins:', desktopPlugins?.map(p => `${p.name} (enabled: ${p.enabled})`));

  // Check if there's a specific way to sync
  console.log('\n2. Try app:restart to refresh...');
  const restart = await request('POST', '/api/app:restart', {}, token);
  console.log('Restart status:', restart.status);

  // Check cache clear
  console.log('\n3. Try clearing UI schema cache...');
  const clearCache = await request('POST', '/api/uiSchemas:clearAncestors', {}, token);
  console.log('Clear cache status:', clearCache.status);

  // Try database sync
  console.log('\n4. Checking if db:sync is available...');
  const dbSync = await request('POST', '/api/db:sync', {}, token);
  console.log('DB sync status:', dbSync.status);

  // Try to ensure the desktopRoutes collection is registered
  console.log('\n5. Checking database collections from db...');
  const dbCollections = await request('GET', '/api/collections:list?filter[hidden]=false&paginate=false', null, token);
  console.log('Total visible collections:', dbCollections.data.data?.length);

  const hasDesktopRoutes = dbCollections.data.data?.find(c => c.name === 'desktopRoutes');
  console.log('Has desktopRoutes in collections:', !!hasDesktopRoutes);

  // Check PM operations
  console.log('\n6. Available PM operations...');
  const pmOps = ['list', 'listByNpm', 'listEnabled'];
  for (const op of pmOps) {
    const result = await request('GET', `/api/pm:${op}`, null, token);
    console.log(`  pm:${op} status:`, result.status);
  }

  // Try to get the exact state of the desktop routes
  console.log('\n7. Final check of desktop routes state...');
  const finalRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false&tree=true', null, token);
  console.log('Routes exist:', finalRoutes.status === 200 && finalRoutes.data.data?.length > 0);

  // The issue might be that routes are created but the client doesn't recognize them
  // because the plugin-desktop-routes is missing. Let's see if we can add it
  console.log('\n8. Checking if plugin-desktop-routes can be installed...');
  const npmList = await request('GET', '/api/pm:listByNpm', null, token);
  const desktopRoutesNpm = npmList.data?.find?.(p => p.name?.includes('desktop') || p.packageName?.includes('desktop-routes'));
  console.log('Desktop routes in npm list:', desktopRoutesNpm ? JSON.stringify(desktopRoutesNpm) : 'Not found');

  // Check if it's already in applicationPlugins but not enabled
  console.log('\n9. All application plugins with desktop in name...');
  plugins.data.data?.filter(p =>
    p.name?.toLowerCase().includes('desktop') ||
    p.packageName?.toLowerCase().includes('desktop')
  ).forEach(p => {
    console.log(`  - ${p.name} (${p.packageName}): enabled=${p.enabled}, installed=${p.installed}`);
  });
}

main().catch(console.error);
