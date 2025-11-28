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
  console.log('=== Fix Route Access for All Roles ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Get all routes
  console.log('1. Getting all routes...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  const routeIds = routes.data.data?.map(r => r.id) || [];
  console.log('Total routes:', routeIds.length);
  routes.data.data?.forEach(r => console.log(`  ${r.id}: ${r.title}`));

  // Check current associations
  console.log('\n2. Checking current role-route associations...');
  const associations = await request('GET', '/api/rolesDesktopRoutes:list?paginate=false', null, token);
  console.log('Current associations:', associations.data.data?.length || 0);

  // Get all roles
  console.log('\n3. Getting all roles...');
  const roles = await request('GET', '/api/roles:list?paginate=false', null, token);
  const roleNames = roles.data.data?.map(r => r.name) || [];
  console.log('Roles:', roleNames);

  // Clear existing associations and recreate
  console.log('\n4. Creating role-route associations for each role...');

  for (const roleName of ['root', 'admin', 'member']) {
    console.log(`\n  Processing role: ${roleName}`);

    // Use the set action to replace all associations
    const setResp = await request('POST', `/api/roles/${roleName}/desktopRoutes:set`, routeIds, token);
    console.log(`  Set response status: ${setResp.status}`);

    if (setResp.status !== 200) {
      console.log(`  Error: ${JSON.stringify(setResp.data).slice(0, 200)}`);

      // Try add instead
      console.log(`  Trying add instead...`);
      for (const routeId of routeIds) {
        const addResp = await request('POST', `/api/roles/${roleName}/desktopRoutes:add`, [routeId], token);
        if (addResp.status === 200) {
          console.log(`    Added route ${routeId}`);
        }
      }
    }
  }

  // Also try directly creating associations in rolesDesktopRoutes
  console.log('\n5. Creating direct associations in rolesDesktopRoutes...');
  for (const roleName of ['root', 'admin', 'member']) {
    for (const routeId of routeIds) {
      const createResp = await request('POST', '/api/rolesDesktopRoutes:create', {
        roleName: roleName,
        desktopRouteId: routeId
      }, token);

      if (createResp.status === 200) {
        console.log(`  Created: ${roleName} -> ${routeId}`);
      } else if (createResp.data?.errors?.[0]?.message?.includes('unique') ||
                 createResp.data?.errors?.[0]?.message?.includes('duplicate')) {
        // Already exists, skip
      } else {
        console.log(`  Failed: ${roleName} -> ${routeId}: ${createResp.data?.errors?.[0]?.message || createResp.status}`);
      }
    }
  }

  // Verify
  console.log('\n6. Verification...');
  const newAssociations = await request('GET', '/api/rolesDesktopRoutes:list?paginate=false', null, token);
  console.log('Total associations now:', newAssociations.data.data?.length || 0);

  // Group by role
  const byRole = {};
  newAssociations.data.data?.forEach(a => {
    byRole[a.roleName] = (byRole[a.roleName] || 0) + 1;
  });
  console.log('By role:', byRole);

  // Check accessible routes now
  console.log('\n7. Checking accessible routes...');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible?tree=true', null, token);
  console.log('Accessible count:', accessible.data.data?.length || 0);

  if (accessible.data.data?.[0]) {
    console.log('Root route:', accessible.data.data[0].title);
    console.log('Children count:', accessible.data.data[0].children?.length || 0);
    accessible.data.data[0].children?.forEach(c => {
      console.log(`  - ${c.title} (children: ${c.children?.length || 0})`);
    });
  }

  // Check role check response
  console.log('\n8. Role check response...');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('desktopRoutes in check:', roleCheck.data.data?.desktopRoutes?.length || 0);

  console.log('\n=== Done! Refresh the browser ===');
}

main().catch(console.error);
