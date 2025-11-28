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
  console.log('=== DevForge Setup Verification ===\n');

  console.log('1. Authenticating...');
  const authResponse = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = authResponse.data?.token;
  if (!token) {
    console.error('   FAILED: Authentication failed');
    process.exit(1);
  }
  console.log('   OK: Token obtained\n');

  // Check desktop routes
  console.log('2. Checking desktop routes...');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log(`   Routes found: ${routes.data?.length || 0}`);
  if (routes.data) {
    routes.data.forEach(r => console.log(`     - ${r.title} [id: ${r.id}]`));
  }

  // Check role permissions for routes
  console.log('\n3. Checking admin role permissions...');
  const adminRole = await request('GET', '/api/roles:get?filterByTk=admin&appends=desktopRoutes,menuUiSchemas', null, token);
  console.log(`   Desktop routes: ${adminRole.data?.desktopRoutes?.length || 0}`);
  console.log(`   Menu UI schemas: ${adminRole.data?.menuUiSchemas?.length || 0}`);

  // Check menu structure
  console.log('\n4. Checking menu structure...');
  const menu = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  if (menu.data?.properties) {
    console.log(`   Menu items at depth 1: ${Object.keys(menu.data.properties).length}`);
    Object.values(menu.data.properties).forEach(item => {
      console.log(`     - ${item.title} (${item['x-component']})`);
    });
  } else {
    console.log('   WARNING: No menu properties found');
  }

  // Check DevForge submenu
  console.log('\n5. Checking DevForge submenu...');
  const devforgeMenu = await request('GET', '/api/uiSchemas:getJsonSchema/devforge-main-menu', null, token);
  if (devforgeMenu.data?.properties) {
    console.log(`   DevForge pages: ${Object.keys(devforgeMenu.data.properties).length}`);
    Object.values(devforgeMenu.data.properties).forEach(item => {
      console.log(`     - ${item.title}`);
    });
  } else {
    console.log('   WARNING: No DevForge submenu properties');
  }

  // Check data collections
  console.log('\n6. Checking data collections...');
  const collections = ['projects', 'agents', 'credentials', 'devforge_workflows', 'devforge_executions'];
  for (const col of collections) {
    const data = await request('GET', `/api/${col}:list?pageSize=1`, null, token);
    const count = data.data?.length || 0;
    const total = data.meta?.count || count;
    console.log(`   ${col}: ${total} records`);
  }

  console.log('\n==========================================');
  console.log('Verification complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Open https://devforge.ilinqsoft.com');
  console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('3. Login with: admin@nocobase.com / admin123');
  console.log('4. You should see Dashboard and DevForge menu');
  console.log('==========================================');
}

main().catch(console.error);
