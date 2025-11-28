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

  // Check current user and roles
  console.log('Checking current user...');
  const meResponse = await request('GET', '/api/auth:check', null, token);
  console.log('Current user:', meResponse.data?.nickname || meResponse.data?.email);

  // Check root schema
  console.log('\nChecking root UI schema...');
  const rootResponse = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  console.log('Root menu exists:', !!rootResponse.data);

  if (!rootResponse.data) {
    console.log('\nRoot menu not found! Creating...');

    // The admin menu might need to be initialized
    const initResponse = await request('POST', '/api/uiSchemas:create', {
      'x-uid': 'nocobase-admin-menu',
      type: 'void',
      'x-component': 'Menu',
      'x-component-props': {
        mode: 'mix',
        theme: 'dark',
        onSelect: '{{ onSelect }}',
        sideMenuRefScopeKey: 'sideMenuRef'
      },
      properties: {}
    }, token);
    console.log('Init response:', initResponse);
  }

  // Check ACL permissions
  console.log('\nChecking ACL permissions...');
  const aclResponse = await request('GET', '/api/roles:check', null, token);
  console.log('Role:', aclResponse.data?.role?.name);

  // Check if user has menu access
  console.log('\nListing available menu schemas...');
  const schemasResponse = await request('GET', '/api/uiSchemas:list?paginate=false', null, token);
  if (schemasResponse.data) {
    const menuSchemas = schemasResponse.data.filter(s => s['x-uid']?.includes('menu') || s['x-uid']?.includes('devforge'));
    console.log('Menu-related schemas:', menuSchemas.map(s => s['x-uid']));
  }

  // Try to bind menu to admin role
  console.log('\nBinding DevForge menu to admin role...');
  const bindResponse = await request('POST', '/api/roles:setMenus', {
    roleName: 'admin',
    menus: ['devforge-main-menu', '64rzwdc0egw', 'bo7r10yqlp7', 'd1d1akjc1n0', '60ec6ji6tb6', 'hj6out1s4b8']
  }, token);
  console.log('Bind response:', bindResponse.data !== undefined ? 'Success' : JSON.stringify(bindResponse));

  // Create a simple Dashboard page that should always be visible
  console.log('\nCreating Dashboard page in main menu...');

  // First check if Dashboard exists
  const dashboardCheck = await request('GET', '/api/uiSchemas:getJsonSchema/y7vf14xkris', null, token);

  if (!dashboardCheck.data) {
    console.log('Creating new Dashboard...');
    const dashboardResponse = await request('POST', '/api/uiSchemas:insertAdjacent/nocobase-admin-menu?position=afterBegin', {
      schema: {
        type: 'void',
        title: 'Dashboard',
        'x-component': 'Menu.Item',
        'x-decorator': 'ACLMenuItemProvider',
        'x-component-props': { icon: 'DashboardOutlined' },
        'x-server-hooks': [{ type: 'onSelfCreate', method: 'bindMenuItemToRole' }],
        properties: {
          page: {
            type: 'void',
            'x-component': 'Page',
            properties: {
              grid: {
                type: 'void',
                'x-component': 'Grid',
                'x-initializer': 'page:addBlock',
                properties: {}
              }
            }
          }
        }
      }
    }, token);
    console.log('Dashboard created:', dashboardResponse.data?.['x-uid'] || JSON.stringify(dashboardResponse.errors));
  } else {
    console.log('Dashboard already exists');
  }

  // Sync database to ensure tables exist
  console.log('\nTriggering database sync...');
  const syncResponse = await request('POST', '/api/collections:sync', {}, token);
  console.log('Sync response:', syncResponse.data !== undefined ? 'Success' : JSON.stringify(syncResponse));

  console.log('\n==========================================');
  console.log('Essayez maintenant:');
  console.log('1. Déconnectez-vous de NocoBase');
  console.log('2. Videz le cache du navigateur (Ctrl+Shift+Delete)');
  console.log('3. Reconnectez-vous sur https://devforge.ilinqsoft.com');
  console.log('==========================================');
}

main().catch(console.error);
