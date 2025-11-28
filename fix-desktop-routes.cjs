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

  // Check existing desktop routes
  console.log('Checking existing desktop routes...');
  const existingRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log('Existing routes:', existingRoutes.data?.length || 0);

  // Get all menu UIDs from uiSchemas
  console.log('\nGetting menu schemas...');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  if (!menuSchema.data) {
    console.error('Admin menu not found');
    process.exit(1);
  }

  // In NocoBase 1.9+, the UI has changed - need to create desktop routes for pages
  // Let's first try to sync the desktop routes from UI schemas
  console.log('\nSyncing desktop routes...');

  // Try to use the desktopRoutes API to create routes for our pages
  const menuItems = [];

  if (menuSchema.data.properties) {
    for (const [key, value] of Object.entries(menuSchema.data.properties)) {
      menuItems.push({
        uid: value['x-uid'],
        title: value.title,
        component: value['x-component'],
        isSubmenu: value['x-component'] === 'Menu.SubMenu'
      });
    }
  }

  console.log('Menu items found:', menuItems);

  // Check if NocoBase has a route sync API
  console.log('\nTrying to initialize admin routes...');
  const initResponse = await request('POST', '/api/desktopRoutes:initAdminRoutes', {}, token);
  console.log('Init routes response:', initResponse);

  // Try to create the admin route
  console.log('\nCreating admin desktop route...');
  const adminRouteResponse = await request('POST', '/api/desktopRoutes:create', {
    parentId: null,
    title: 'Admin',
    type: 'page',
    schemaUid: 'nocobase-admin-menu',
    options: {},
    sort: 1
  }, token);
  console.log('Admin route response:', adminRouteResponse);

  // Create routes for each menu item
  console.log('\nCreating routes for menu items...');
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const routeResponse = await request('POST', '/api/desktopRoutes:create', {
      parentId: adminRouteResponse.data?.id || null,
      title: item.title,
      type: item.isSubmenu ? 'tabs' : 'page',
      menuSchemaUid: item.uid,
      schemaUid: item.uid,
      hideInMenu: false,
      options: {},
      sort: i + 1
    }, token);
    console.log(`  Route for ${item.title}:`, routeResponse.data?.id || routeResponse.errors || 'failed');
  }

  // Check routes again
  console.log('\nVerifying desktop routes...');
  const finalRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log('Final routes count:', finalRoutes.data?.length || 0);
  if (finalRoutes.data) {
    for (const route of finalRoutes.data) {
      console.log(`  - ${route.title} [id: ${route.id}]`);
    }
  }

  // Try restarting the app to apply changes
  console.log('\nRestarting application...');
  const restartResponse = await request('POST', '/api/app:restart', {}, token);
  console.log('Restart response:', restartResponse);

  console.log('\n==========================================');
  console.log('Desktop routes configuration attempted!');
  console.log('Please refresh the page and try again.');
  console.log('==========================================');
}

main().catch(console.error);
