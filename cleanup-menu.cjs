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

  // Remove the duplicate Projects page (the old one: 2jqhhfdz2ld)
  console.log('Removing duplicate Projects page...');
  const removeResponse = await request('POST', '/api/uiSchemas:remove/2jqhhfdz2ld', null, token);
  console.log('Remove response:', removeResponse.data !== undefined ? 'Success' : JSON.stringify(removeResponse));

  // Verify final menu structure
  console.log('\nVerifying final menu structure...');
  const menuResponse = await request('GET', '/api/uiSchemas:getJsonSchema/devforge-main-menu', null, token);

  if (menuResponse.data?.properties) {
    console.log('\nDevForge Menu Pages:');
    for (const [key, value] of Object.entries(menuResponse.data.properties)) {
      console.log(`  - ${value.title || key} [uid: ${value['x-uid']}]`);
    }
  }

  console.log('\n==========================================');
  console.log('Menu cleanup complete!');
  console.log('==========================================');
  console.log('\nPour accéder aux pages DevForge:');
  console.log('1. Allez sur https://devforge.ilinqsoft.com');
  console.log('2. Connectez-vous: admin@nocobase.com / admin123');
  console.log('3. Dans le menu à gauche, cliquez sur "DevForge"');
  console.log('4. Vous verrez: Projects, Agents, Workflows, Credentials, Executions');
}

main().catch(console.error);
