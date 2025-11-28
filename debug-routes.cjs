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
  console.log('=== Debug Desktop Routes ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Get all routes with full details
  console.log('1. Getting routes directly from database...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false&sort=id', null, token);
  console.log('Routes status:', routes.status);
  console.log('Routes count:', routes.data.data?.length || 0);
  console.log('Full response:', JSON.stringify(routes.data, null, 2).slice(0, 1000));

  // Try getting by specific ID
  console.log('\n2. Getting route by ID 333984371113984...');
  const route = await request('GET', '/api/desktopRoutes:get?filterByTk=333984371113984', null, token);
  console.log('Route status:', route.status);
  console.log('Route:', JSON.stringify(route.data, null, 2));

  // Check accessible routes with full details
  console.log('\n3. Accessible routes:');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible?tree=true', null, token);
  console.log('Status:', accessible.status);
  console.log('Full response:', JSON.stringify(accessible.data, null, 2));

  // Try getting the desktop routes from the roles
  console.log('\n4. Root role desktopRoutes:');
  const rootRoutes = await request('GET', '/api/roles/root/desktopRoutes:list?paginate=false', null, token);
  console.log('Status:', rootRoutes.status);
  console.log('Count:', rootRoutes.data.data?.length || 0);
  console.log('Data:', JSON.stringify(rootRoutes.data, null, 2).slice(0, 500));

  // Check what plugins are loaded (may give hints)
  console.log('\n5. Check plugins status...');
  const pm = await request('GET', '/api/pm:list?state=enabled', null, token);
  const desktopPlugin = pm.data.data?.find(p => p.name?.includes('desktop') || p.packageName?.includes('desktop'));
  console.log('Desktop routes plugin:', desktopPlugin ? JSON.stringify(desktopPlugin) : 'Not found in list');

  // Check applicationPlugins table
  console.log('\n6. Application plugins:');
  const plugins = await request('GET', '/api/applicationPlugins:list?paginate=false', null, token);
  const relevant = plugins.data.data?.filter(p =>
    p.name?.includes('desktop') ||
    p.name?.includes('route') ||
    p.name?.includes('menu') ||
    p.name?.includes('acl')
  );
  relevant?.forEach(p => console.log(`  - ${p.name} (${p.enabled ? 'enabled' : 'disabled'})`));
}

main().catch(console.error);
