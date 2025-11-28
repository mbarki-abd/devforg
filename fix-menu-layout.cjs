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

  // Check if nocobase-admin-menu has the correct structure
  console.log('Checking admin menu schema...');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  if (menuSchema.data) {
    console.log('Menu schema component:', menuSchema.data['x-component']);
    console.log('Menu properties count:', Object.keys(menuSchema.data.properties || {}).length);

    // List all menu items
    for (const [key, value] of Object.entries(menuSchema.data.properties || {})) {
      console.log(`  - ${key}: ${value.title} (${value['x-component']})`);
    }
  }

  // The problem is that menu items are not properly configured
  // Let's check the system settings
  console.log('\nChecking system settings...');
  const systemSettings = await request('GET', '/api/systemSettings:get', null, token);
  console.log('System settings:', JSON.stringify(systemSettings.data, null, 2));

  // Check application UI schema
  console.log('\nChecking application UI schema...');
  const appSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-app', null, token);
  if (appSchema.data) {
    console.log('App schema exists');
    console.log('App component:', appSchema.data['x-component']);
  } else {
    console.log('App schema not found');
  }

  // List all root schemas
  console.log('\nListing root UI schemas...');
  const rootSchemas = await request('GET', '/api/uiSchemas:list?filter[parentKey.$null]=true&paginate=false', null, token);
  if (rootSchemas.data) {
    console.log('Root schemas:');
    for (const schema of rootSchemas.data) {
      console.log(`  - ${schema['x-uid']}: ${schema['x-component']} (${schema.title || 'no title'})`);
    }
  }

  // The issue is the menu mode - it should be 'mix' which shows both top and side menus
  // Let's update the admin menu component props
  console.log('\nUpdating menu configuration...');

  // First, let's check what the current menu mode is
  const currentMenu = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  console.log('Current menu component props:', currentMenu.data?.['x-component-props']);

  // Update the menu to ensure it has the correct mode
  const updateMenuResponse = await request('POST', '/api/uiSchemas:patch/nocobase-admin-menu', {
    'x-component-props': {
      mode: 'mix',
      theme: 'dark',
      onSelect: '{{ onSelect }}',
      sideMenuRefScopeKey: 'sideMenuRef'
    }
  }, token);
  console.log('Menu update response:', updateMenuResponse.data !== undefined ? 'Success' : JSON.stringify(updateMenuResponse));

  // Now let's ensure all DevForge menu items are correctly structured
  // The issue might be that our menu items don't have the correct server hooks
  console.log('\nUpdating DevForge menu items with proper ACL bindings...');

  // Get all DevForge menu UIDs
  const devforgeMenu = await request('GET', '/api/uiSchemas:getJsonSchema/devforge-main-menu', null, token);

  if (devforgeMenu.data?.properties) {
    const menuUids = Object.values(devforgeMenu.data.properties).map(p => p['x-uid']).filter(Boolean);
    console.log('DevForge page UIDs:', menuUids);

    // Update each menu item to ensure ACL is set
    for (const uid of menuUids) {
      await request('POST', `/api/uiSchemas:patch/${uid}`, {
        'x-decorator': 'ACLMenuItemProvider',
        'x-server-hooks': [{ type: 'onSelfCreate', method: 'bindMenuItemToRole' }]
      }, token);
    }
    console.log('Updated ACL for all DevForge pages');
  }

  // Ensure the root user has access to all menus
  console.log('\nUpdating role menu access...');

  // Get all menu UIDs
  const allMenuUids = [];
  if (menuSchema.data?.properties) {
    for (const value of Object.values(menuSchema.data.properties)) {
      allMenuUids.push(value['x-uid']);
      if (value.properties) {
        for (const child of Object.values(value.properties)) {
          if (child['x-uid']) allMenuUids.push(child['x-uid']);
        }
      }
    }
  }

  console.log('All menu UIDs:', allMenuUids);

  // Update root role to have access to all menus
  const rootRoleUpdate = await request('POST', '/api/roles:update?filterByTk=root', {
    menuUiSchemas: allMenuUids
  }, token);
  console.log('Root role update:', rootRoleUpdate.data !== undefined ? 'Success' : JSON.stringify(rootRoleUpdate));

  // Also update admin role
  const adminRoleUpdate = await request('POST', '/api/roles:update?filterByTk=admin', {
    menuUiSchemas: allMenuUids
  }, token);
  console.log('Admin role update:', adminRoleUpdate.data !== undefined ? 'Success' : JSON.stringify(adminRoleUpdate));

  // Force reload application
  console.log('\nTriggering application reload...');
  const reloadResponse = await request('POST', '/api/app:restart', {}, token);
  console.log('Reload response:', reloadResponse);

  console.log('\n==========================================');
  console.log('Configuration updated!');
  console.log('Please wait a moment and refresh the page.');
  console.log('==========================================');
}

main().catch(console.error);
