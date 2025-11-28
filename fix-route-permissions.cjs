const https = require('https');

const API_URL = 'https://devforge.ilinqsoft.com/api';

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log('Authenticating...');
  const authResponse = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = authResponse.data?.token;
  if (!token) {
    console.error('Failed to get token:', authResponse);
    process.exit(1);
  }
  console.log('Token obtained\n');

  // Get all desktop routes
  console.log('Getting desktop routes...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log('Routes found:', routes.data?.length || 0);

  if (!routes.data || routes.data.length === 0) {
    console.log('No routes found. Please run fix-desktop-routes.cjs first.');
    return;
  }

  const routeIds = routes.data.map(r => r.id);
  console.log('Route IDs:', routeIds);

  // Get all roles
  console.log('\nGetting roles...');
  const roles = await request('GET', '/api/roles:list?paginate=false', null, token);
  console.log('Roles:', roles.data?.map(r => r.name));

  // Grant desktop route access to admin and root roles
  const rolesToUpdate = ['admin', 'root', 'member'];

  for (const roleName of rolesToUpdate) {
    console.log(`\nGranting desktop routes to ${roleName} role...`);

    // Try to update role with desktop routes
    const updateResponse = await request('POST', `/api/roles:update?filterByTk=${roleName}`, {
      desktopRoutes: routeIds
    }, token);
    console.log(`${roleName} role update:`, updateResponse.data !== undefined ? 'Success' : JSON.stringify(updateResponse));
  }

  // Also try the rolesDesktopRoutes API directly
  console.log('\nTrying direct rolesDesktopRoutes API...');
  for (const routeId of routeIds) {
    for (const roleName of ['admin', 'root']) {
      const linkResponse = await request('POST', '/api/rolesDesktopRoutes:create', {
        roleName: roleName,
        desktopRouteId: routeId
      }, token);
      console.log(`Link ${routeId} to ${roleName}:`, linkResponse.data !== undefined ? 'OK' : (linkResponse.errors || 'failed'));
    }
  }

  // Verify the associations
  console.log('\nVerifying role-route associations...');
  const adminRole = await request('GET', '/api/roles:get?filterByTk=admin&appends=desktopRoutes', null, token);
  console.log('Admin desktop routes:', adminRole.data?.desktopRoutes?.map(r => r.title) || 'none');

  console.log('\n==========================================');
  console.log('Route permissions configured!');
  console.log('Please clear browser cache and refresh.');
  console.log('==========================================');
}

main().catch(console.error);
