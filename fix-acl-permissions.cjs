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

  // List all roles
  console.log('Listing roles...');
  const rolesResponse = await request('GET', '/api/roles:list?paginate=false', null, token);
  if (rolesResponse.data) {
    console.log('Roles:');
    for (const role of rolesResponse.data) {
      console.log(`  - ${role.name}: ${role.title}`);
    }
  }

  // Get admin role details
  console.log('\nGetting admin role details...');
  const adminRole = await request('GET', '/api/roles:get?filterByTk=admin&appends=menuUiSchemas', null, token);
  console.log('Admin role menuUiSchemas:', adminRole.data?.menuUiSchemas?.map(m => m['x-uid']) || 'none');

  // Get all menu UIDs
  const menuResponse = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  const menuUids = [];

  if (menuResponse.data?.properties) {
    for (const [key, value] of Object.entries(menuResponse.data.properties)) {
      menuUids.push(value['x-uid']);
      console.log(`Found menu: ${value.title} [${value['x-uid']}]`);

      // Also add child menus
      if (value.properties) {
        for (const [childKey, childValue] of Object.entries(value.properties)) {
          if (childValue['x-uid']) {
            menuUids.push(childValue['x-uid']);
          }
        }
      }
    }
  }

  // Grant all menu permissions to admin role
  console.log('\nGranting menu permissions to admin role...');
  console.log('Menu UIDs to grant:', menuUids);

  // Use the correct API endpoint for setting menu permissions
  const grantResponse = await request('POST', '/api/roles:update?filterByTk=admin', {
    menuUiSchemas: menuUids
  }, token);
  console.log('Grant response:', grantResponse.data !== undefined ? 'Success' : JSON.stringify(grantResponse));

  // Also update via rolesUiSchemas
  console.log('\nUpdating rolesUiSchemas...');
  for (const uid of menuUids) {
    const schemaUpdate = await request('POST', `/api/uiSchemas:patch/${uid}`, {
      'x-acl-action': 'admin:*'
    }, token);
  }

  // Check root role
  console.log('\nChecking root role...');
  const rootRole = await request('GET', '/api/roles:get?filterByTk=root&appends=menuUiSchemas', null, token);
  if (rootRole.data) {
    console.log('Root role exists');

    // Grant to root too
    await request('POST', '/api/roles:update?filterByTk=root', {
      menuUiSchemas: menuUids
    }, token);
    console.log('Granted menus to root role');
  }

  // Check current user's role
  console.log('\nChecking current user...');
  const userResponse = await request('GET', '/api/users:get?filterByTk=1&appends=roles', null, token);
  console.log('User roles:', userResponse.data?.roles?.map(r => r.name));

  // Ensure user has admin role
  if (userResponse.data && !userResponse.data.roles?.some(r => r.name === 'admin')) {
    console.log('Adding admin role to user...');
    await request('POST', '/api/users:update?filterByTk=1', {
      roles: [...(userResponse.data.roles || []).map(r => r.name), 'admin']
    }, token);
  }

  console.log('\n==========================================');
  console.log('Permissions updated!');
  console.log('');
  console.log('Actions à faire:');
  console.log('1. Videz le cache du navigateur (Ctrl+Shift+Delete)');
  console.log('2. Déconnectez-vous complètement');
  console.log('3. Reconnectez-vous sur https://devforge.ilinqsoft.com');
  console.log('==========================================');
}

main().catch(console.error);
