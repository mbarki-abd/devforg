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
  console.log('=== Creating Desktop Routes via API ===\n');

  // Login
  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed:', auth);
    return;
  }
  console.log('Logged in successfully\n');

  // First check existing routes
  console.log('1. Checking existing desktop routes...');
  const existingRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log('Existing routes:', existingRoutes.data.data?.length || 0);

  if (existingRoutes.data.data?.length > 0) {
    console.log('Routes already exist:');
    existingRoutes.data.data.forEach(r => console.log(`  - ${r.title} (${r.id})`));

    // Let's check if the routes just need role access
    console.log('\n2. Granting desktop routes access to admin role...');
    const routeIds = existingRoutes.data.data.map(r => r.id);

    const grantResp = await request('POST', '/api/roles/root/desktopRoutes:set', routeIds, token);
    console.log('Root role grant:', grantResp.status === 200 ? 'OK' : grantResp.data);

    const grantAdminResp = await request('POST', '/api/roles/admin/desktopRoutes:set', routeIds, token);
    console.log('Admin role grant:', grantAdminResp.status === 200 ? 'OK' : grantAdminResp.data);

  } else {
    // Get the UI schema UIDs from the menu
    console.log('\n2. Getting menu schema UIDs...');
    const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

    const menuItems = [];
    if (menuSchema.data.data?.properties) {
      for (const [key, value] of Object.entries(menuSchema.data.data.properties)) {
        const uid = value['x-uid'];
        const title = value.title;
        const pageUid = value.properties?.page?.['x-uid'];

        if (value['x-component'] === 'Menu.SubMenu') {
          // This is a submenu (like DevForge)
          menuItems.push({
            type: 'group',
            title: title,
            schemaUid: uid,
            children: []
          });

          // Get children
          if (value.properties) {
            for (const [childKey, childValue] of Object.entries(value.properties)) {
              if (childValue['x-component'] === 'Menu.Item') {
                const childPageUid = childValue.properties?.page?.['x-uid'];
                menuItems[menuItems.length - 1].children.push({
                  type: 'page',
                  title: childValue.title,
                  schemaUid: childPageUid || childValue['x-uid'],
                });
              }
            }
          }
        } else if (value['x-component'] === 'Menu.Item') {
          menuItems.push({
            type: 'page',
            title: title,
            schemaUid: pageUid || uid,
          });
        }
      }
    }

    console.log('Found menu items:', JSON.stringify(menuItems, null, 2));

    // Create desktop routes
    console.log('\n3. Creating desktop routes...');
    let sortOrder = 1;

    for (const item of menuItems) {
      if (item.type === 'group') {
        // Create group route first
        const groupResp = await request('POST', '/api/desktopRoutes:create', {
          type: 'group',
          title: item.title,
          schemaUid: item.schemaUid,
          sort: sortOrder++
        }, token);

        const groupId = groupResp.data.data?.id;
        console.log(`Created group: ${item.title} (id: ${groupId})`);

        // Create child routes
        for (const child of item.children) {
          const childResp = await request('POST', '/api/desktopRoutes:create', {
            type: 'page',
            title: child.title,
            schemaUid: child.schemaUid,
            parentId: groupId,
            sort: sortOrder++
          }, token);
          console.log(`  Created page: ${child.title} (id: ${childResp.data.data?.id})`);
        }
      } else {
        const pageResp = await request('POST', '/api/desktopRoutes:create', {
          type: 'page',
          title: item.title,
          schemaUid: item.schemaUid,
          sort: sortOrder++
        }, token);
        console.log(`Created page: ${item.title} (id: ${pageResp.data.data?.id})`);
      }
    }

    // Grant access to roles
    console.log('\n4. Granting access to roles...');
    const allRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
    const routeIds = allRoutes.data.data?.map(r => r.id) || [];

    const grantRootResp = await request('POST', '/api/roles/root/desktopRoutes:set', routeIds, token);
    console.log('Root role:', grantRootResp.status === 200 ? 'OK' : grantRootResp.data);

    const grantAdminResp = await request('POST', '/api/roles/admin/desktopRoutes:set', routeIds, token);
    console.log('Admin role:', grantAdminResp.status === 200 ? 'OK' : grantAdminResp.data);
  }

  // Verify
  console.log('\n5. Verification...');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Desktop routes in check:', roleCheck.data.data?.desktopRoutes?.length || 0);
  console.log('Menu UIDs in check:', roleCheck.data.data?.allowMenuItemIds?.length || 0);

  const accessible = await request('GET', '/api/desktopRoutes:listAccessible', null, token);
  console.log('Accessible routes:', accessible.data.data?.length || 0);
  accessible.data.data?.forEach(r => console.log(`  - ${r.title}`));

  console.log('\n=== Done! Refresh the browser to see changes ===');
}

main().catch(console.error);
