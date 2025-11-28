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

  // List all collections
  console.log('Listing all collections...');
  const collectionsResponse = await request('GET', '/api/collections:list?paginate=false', null, token);

  if (collectionsResponse.data) {
    console.log('\nCollections:');
    for (const collection of collectionsResponse.data) {
      console.log(`  - ${collection.name}: ${collection.title || 'No title'}`);
    }
  } else {
    console.log('Collections response:', JSON.stringify(collectionsResponse, null, 2));
  }

  // Get executions collection specifically
  console.log('\nGetting executions collection...');
  const execResponse = await request('GET', '/api/collections:get/executions', null, token);
  console.log('Executions collection:', JSON.stringify(execResponse, null, 2));

  // Try getting fields for executions
  console.log('\nGetting executions fields...');
  const fieldsResponse = await request('GET', '/api/collections.fields:list?filter[collectionName]=executions', null, token);
  console.log('Fields:', JSON.stringify(fieldsResponse, null, 2));
}

main().catch(console.error);
