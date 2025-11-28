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
  console.log('=== Adding DevForge Child Routes ===\n');

  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed');
    return;
  }

  // Get current routes
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  const devforgeRoute = routes.data.data?.find(r => r.title === 'DevForge');

  if (!devforgeRoute) {
    console.log('DevForge route not found');
    return;
  }

  console.log('DevForge route ID:', devforgeRoute.id);
  console.log('DevForge type:', devforgeRoute.type);

  // Get menu schema to find child menu UIDs
  console.log('\nGetting DevForge menu children...');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  // Find DevForge submenu
  let devforgeMenu = null;
  for (const [key, value] of Object.entries(menuSchema.data.data?.properties || {})) {
    if (value.title === 'DevForge' && value['x-component'] === 'Menu.SubMenu') {
      devforgeMenu = value;
      break;
    }
  }

  if (!devforgeMenu) {
    console.log('DevForge menu schema not found');
    return;
  }

  console.log('DevForge menu UID:', devforgeMenu['x-uid']);

  // Get children
  const children = [];
  for (const [key, value] of Object.entries(devforgeMenu.properties || {})) {
    if (value['x-component'] === 'Menu.Item') {
      const pageUid = value.properties?.page?.['x-uid'];
      children.push({
        key: key,
        title: value.title,
        menuUid: value['x-uid'],
        pageUid: pageUid,
        icon: value['x-component-props']?.icon
      });
    }
  }

  console.log('\nFound child menus:', children.length);
  children.forEach(c => console.log(`  - ${c.title} (menu: ${c.menuUid}, page: ${c.pageUid})`));

  // Check if child routes already exist
  console.log('\nChecking for existing child routes...');
  const existingChildren = routes.data.data?.filter(r => r.parentId === devforgeRoute.id);
  console.log('Existing children:', existingChildren?.length || 0);

  // Create child routes if they don't exist
  console.log('\nCreating child routes under DevForge...');
  let sortOrder = 1;

  for (const child of children) {
    // Check if already exists
    const exists = existingChildren?.find(e => e.schemaUid === child.menuUid || e.schemaUid === child.pageUid);
    if (exists) {
      console.log(`  ${child.title} already exists (id: ${exists.id})`);
      continue;
    }

    // Create the route
    const createResp = await request('POST', '/api/desktopRoutes:create', {
      title: child.title,
      type: 'page',
      schemaUid: child.menuUid,
      menuSchemaUid: child.menuUid,
      parentId: devforgeRoute.id,
      sort: sortOrder++,
      icon: child.icon,
      hideInMenu: false
    }, token);

    if (createResp.status === 200 && createResp.data.data?.id) {
      console.log(`  Created: ${child.title} (id: ${createResp.data.data.id})`);

      // Grant access to roles
      const routeId = createResp.data.data.id;
      await request('POST', '/api/rolesDesktopRoutes:create', { roleName: 'root', desktopRouteId: routeId }, token);
      await request('POST', '/api/rolesDesktopRoutes:create', { roleName: 'admin', desktopRouteId: routeId }, token);
      await request('POST', '/api/rolesDesktopRoutes:create', { roleName: 'member', desktopRouteId: routeId }, token);
    } else {
      console.log(`  Failed: ${child.title}`, createResp.data);
    }
  }

  // Verify
  console.log('\n=== Verification ===');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible?tree=true', null, token);
  const accessibleDevForge = accessible.data.data?.[0]?.children?.find(c => c.title === 'DevForge');
  console.log('DevForge accessible children:', accessibleDevForge?.children?.length || 0);
  accessibleDevForge?.children?.forEach(c => console.log(`  - ${c.title}`));

  console.log('\n=== Done! Refresh the browser ===');
}

main().catch(console.error);
