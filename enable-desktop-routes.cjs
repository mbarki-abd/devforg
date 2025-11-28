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
  console.log('=== Enable Desktop Routes Plugin ===\n');

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
  console.log('1. Listing all plugins...');
  const plugins = await request('GET', '/api/pm:list', null, token);
  console.log('Total plugins:', plugins.data.data?.length || 0);

  // Find desktop-routes plugin
  const desktopRoutesPlugin = plugins.data.data?.find(p =>
    p.name?.includes('desktop') ||
    p.packageName?.includes('desktop-routes')
  );

  if (desktopRoutesPlugin) {
    console.log('\nDesktop routes plugin found:', desktopRoutesPlugin.name);
    console.log('Enabled:', desktopRoutesPlugin.enabled);
    console.log('Installed:', desktopRoutesPlugin.installed);

    if (!desktopRoutesPlugin.enabled) {
      console.log('\nEnabling plugin...');
      const enableResp = await request('POST', `/api/pm:enable/${desktopRoutesPlugin.name}`, {}, token);
      console.log('Enable response:', enableResp.status, enableResp.data);
    }
  } else {
    console.log('\nDesktop routes plugin NOT in list. Looking for it...');

    // List available plugins to install
    console.log('\n2. Checking available plugins...');
    const available = await request('GET', '/api/pm:listByNpm', null, token);
    console.log('Available count:', available.data?.length || 0);

    const desktopAvailable = available.data?.find?.(p =>
      p.name?.includes('desktop') || p.packageName?.includes('desktop')
    );

    if (desktopAvailable) {
      console.log('Desktop plugin available:', desktopAvailable);
    }
  }

  // List all plugins with their status
  console.log('\n3. All plugins related to routing/menu:');
  const routingPlugins = plugins.data.data?.filter(p =>
    p.name?.includes('route') ||
    p.name?.includes('menu') ||
    p.name?.includes('desktop') ||
    p.name?.includes('client') ||
    p.name?.includes('acl') ||
    p.name?.includes('ui-schema')
  );

  routingPlugins?.forEach(p => {
    console.log(`  ${p.name}: enabled=${p.enabled}, installed=${p.installed}`);
  });

  // Check if desktopRoutes collection exists
  console.log('\n4. Checking desktopRoutes collection...');
  const collections = await request('GET', '/api/collections:list?paginate=false', null, token);
  const desktopRoutesCollection = collections.data.data?.find(c => c.name === 'desktopRoutes');
  console.log('desktopRoutes collection:', desktopRoutesCollection ? 'EXISTS' : 'NOT FOUND');

  // Try listing desktopRoutes directly
  console.log('\n5. Trying to list desktopRoutes...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log('Status:', routes.status);
  console.log('Count:', routes.data.data?.length || 0);
  routes.data.data?.forEach(r => console.log(`  - ${r.title} (id: ${r.id})`));

  // Check listAccessible endpoint
  console.log('\n6. Checking listAccessible endpoint...');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible', null, token);
  console.log('Status:', accessible.status);
  if (accessible.status !== 200) {
    console.log('Error:', JSON.stringify(accessible.data).slice(0, 500));
  } else {
    console.log('Count:', accessible.data.data?.length || 0);
  }
}

main().catch(console.error);
