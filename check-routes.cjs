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

  // Check accessible routes
  console.log('Getting accessible routes...');
  const accessibleRoutes = await request('GET', '/api/desktopRoutes:listAccessible?tree=true&appends=uiSchema,children', null, token);
  console.log('Accessible routes:');
  console.log(JSON.stringify(accessibleRoutes, null, 2));

  // Check all routes
  console.log('\nAll desktop routes:');
  const allRoutes = await request('GET', '/api/desktopRoutes:list?paginate=false&appends=uiSchema', null, token);
  if (allRoutes.data) {
    for (const route of allRoutes.data) {
      console.log(`  - ${route.title} [id: ${route.id}, type: ${route.type}, schemaUid: ${route.schemaUid}]`);
      if (route.uiSchema) {
        console.log(`    Schema: ${route.uiSchema['x-component']}`);
      }
    }
  }

  // Check current user's role and permissions
  console.log('\nChecking current user permissions...');
  const checkResponse = await request('GET', '/api/roles:check', null, token);
  console.log('Current role:', checkResponse.data?.role?.name);
  console.log('Desktop routes:', checkResponse.data?.desktopRoutes?.length || 'not available');
}

main().catch(console.error);
