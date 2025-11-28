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
  console.log('=== Setting up NocoBase Project Management ===\n');

  console.log('1. Authenticating...');
  const authResponse = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = authResponse.data?.token;
  if (!token) {
    console.error('Failed to get token:', authResponse);
    process.exit(1);
  }
  console.log('   Token obtained\n');

  // First, let's clear existing broken desktop routes
  console.log('2. Cleaning up existing routes...');
  const existingRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  if (existingRoutes.data) {
    for (const route of existingRoutes.data) {
      await request('POST', `/api/desktopRoutes:destroy?filterByTk=${route.id}`, null, token);
      console.log(`   Removed route: ${route.title}`);
    }
  }

  // Clear existing menu items
  console.log('\n3. Checking existing UI schemas...');
  const adminMenu = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  if (adminMenu.data?.properties) {
    const items = Object.values(adminMenu.data.properties);
    console.log(`   Found ${items.length} existing menu items`);
  }

  // The issue is that NocoBase 1.9+ uses a different UI system
  // Instead of creating uiSchemas, we need to use the proper page creation workflow
  // Let's trigger the migration/initialization of desktop routes

  console.log('\n4. Initializing desktop routes from UI schemas...');

  // Try to migrate UI schemas to desktop routes
  const migrateResponse = await request('POST', '/api/desktopRoutes:syncFromUiSchema', {}, token);
  console.log('   Migration response:', migrateResponse.data !== undefined ? 'Success' : JSON.stringify(migrateResponse).substring(0, 100));

  // Check if routes were created
  const routesAfter = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log(`   Routes after migration: ${routesAfter.data?.length || 0}`);

  // If no routes, let's manually create them from the menu schema
  if (!routesAfter.data || routesAfter.data.length === 0) {
    console.log('\n5. Creating desktop routes manually...');

    // Get all menu UIDs
    const menuUIDs = [];
    if (adminMenu.data?.properties) {
      for (const [key, value] of Object.entries(adminMenu.data.properties)) {
        menuUIDs.push({
          uid: value['x-uid'],
          title: value.title,
          component: value['x-component']
        });
      }
    }

    console.log('   Menu items to migrate:', menuUIDs);

    // Create root admin route
    const adminRoute = await request('POST', '/api/desktopRoutes:create', {
      title: 'Admin',
      type: 'page',
      schemaUid: null,
      menuSchemaUid: 'nocobase-admin-menu',
      hideInMenu: true,
      options: {},
      sort: 0
    }, token);
    console.log('   Created admin route:', adminRoute.data?.id);

    // Create routes for each menu item
    let sort = 1;
    for (const item of menuUIDs) {
      const routeResponse = await request('POST', '/api/desktopRoutes:create', {
        parentId: adminRoute.data?.id,
        title: item.title,
        type: item.component === 'Menu.SubMenu' ? 'tabs' : 'page',
        schemaUid: item.uid,
        menuSchemaUid: item.uid,
        hideInMenu: false,
        options: {},
        sort: sort++
      }, token);
      console.log(`   Created route for ${item.title}:`, routeResponse.data?.id || 'failed');
    }
  }

  // Update role permissions for routes
  console.log('\n6. Updating role permissions...');
  const finalRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  const routeIds = finalRoutes.data?.map(r => r.id) || [];

  for (const role of ['root', 'admin', 'member']) {
    await request('POST', `/api/roles:update?filterByTk=${role}`, {
      desktopRoutes: routeIds
    }, token);
    console.log(`   Updated ${role} role with ${routeIds.length} routes`);
  }

  // Restart app to apply changes
  console.log('\n7. Restarting application...');
  await request('POST', '/api/app:restart', {}, token);

  console.log('\n==========================================');
  console.log('Setup complete!');
  console.log('');
  console.log('To access NocoBase:');
  console.log('1. Open https://devforge.ilinqsoft.com');
  console.log('2. Clear browser cache (Ctrl+Shift+R)');
  console.log('3. Login: admin@nocobase.com / admin123');
  console.log('==========================================');
}

main().catch(console.error);
