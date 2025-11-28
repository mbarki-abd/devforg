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

  // Check admin menu structure
  console.log('Checking admin menu structure...');
  const menuResponse = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  console.log('\nMain Menu Items:');
  if (menuResponse.data?.properties) {
    for (const [key, value] of Object.entries(menuResponse.data.properties)) {
      console.log(`  - ${value.title || key} (${value['x-component']}) [uid: ${value['x-uid']}]`);

      // If it's a submenu, show children
      if (value.properties) {
        for (const [childKey, childValue] of Object.entries(value.properties)) {
          if (childValue.title) {
            console.log(`      - ${childValue.title} [uid: ${childValue['x-uid']}]`);
          }
        }
      }
    }
  } else {
    console.log('Menu response:', JSON.stringify(menuResponse, null, 2));
  }

  // Check DevForge menu specifically
  console.log('\n\nChecking DevForge menu...');
  const devforgeMenu = await request('GET', '/api/uiSchemas:getJsonSchema/devforge-main-menu', null, token);

  if (devforgeMenu.data) {
    console.log('DevForge Menu exists!');
    console.log('Title:', devforgeMenu.data.title);
    console.log('Component:', devforgeMenu.data['x-component']);

    if (devforgeMenu.data.properties) {
      console.log('\nDevForge Pages:');
      for (const [key, value] of Object.entries(devforgeMenu.data.properties)) {
        console.log(`  - ${value.title || key} [uid: ${value['x-uid']}]`);
      }
    }
  } else {
    console.log('DevForge menu not found:', devforgeMenu);
  }
}

main().catch(console.error);
