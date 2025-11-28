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
  console.log('=== Full DevForge Diagnostic ===\n');

  // 1. Login
  const auth = await request('POST', '/api/auth:signIn', {
    account: 'admin@nocobase.com',
    password: 'admin123'
  });

  const token = auth.data.data?.token;
  if (!token) {
    console.log('Auth failed:', auth.data);
    return;
  }
  console.log('✓ Authentication successful\n');

  // 2. Check plugins status
  console.log('=== Plugin Status ===');
  const plugins = await request('GET', '/api/pm:list', null, token);
  const criticalPlugins = ['client', 'desktop', 'desktop-routes', 'acl', 'ui-schema-storage'];
  for (const name of criticalPlugins) {
    const plugin = plugins.data.data?.find(p => p.name?.includes(name));
    if (plugin) {
      console.log(`  ${name}: enabled=${plugin.enabled}, installed=${plugin.installed}`);
    } else {
      console.log(`  ${name}: NOT FOUND`);
    }
  }

  // 3. Check desktop routes
  console.log('\n=== Desktop Routes ===');
  const routes = await request('GET', '/api/desktopRoutes:list?paginate=false', null, token);
  console.log(`Total routes: ${routes.data.data?.length || 0}`);
  routes.data.data?.forEach(r => {
    console.log(`  - ${r.title} (id=${r.id}, type=${r.type}, parentId=${r.parentId || 'root'})`);
  });

  // 4. Check accessible routes for current user
  console.log('\n=== Accessible Routes ===');
  const accessible = await request('GET', '/api/desktopRoutes:listAccessible?tree=true', null, token);
  console.log('Status:', accessible.status);
  if (accessible.data.data) {
    function printRoutes(routes, indent = '') {
      for (const route of routes) {
        console.log(`${indent}- ${route.title}`);
        if (route.children?.length) {
          printRoutes(route.children, indent + '  ');
        }
      }
    }
    printRoutes(accessible.data.data);
  }

  // 5. Check role permissions
  console.log('\n=== Role Check ===');
  const roleCheck = await request('GET', '/api/roles:check', null, token);
  console.log('Role:', roleCheck.data.data?.role?.name);
  console.log('allowAll:', roleCheck.data.data?.allowAll);
  console.log('allowConfigure:', roleCheck.data.data?.allowConfigure);
  console.log('desktopRoutes count:', roleCheck.data.data?.desktopRoutes?.length || 0);
  console.log('menuUiSchemas count:', roleCheck.data.data?.menuUiSchemas?.length || 0);

  // 6. Check the main menu UI schema
  console.log('\n=== Main Menu UI Schema ===');
  const menuSchema = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);
  if (menuSchema.status === 200 && menuSchema.data.data) {
    const props = Object.keys(menuSchema.data.data.properties || {});
    console.log('Menu items:', props.length);
    for (const [key, value] of Object.entries(menuSchema.data.data.properties || {})) {
      console.log(`  - ${key}: title="${value.title}", component=${value['x-component']}`);
    }
  } else {
    console.log('Error:', menuSchema.status, menuSchema.data?.errors?.[0]?.message);
  }

  // 7. Check system settings
  console.log('\n=== System Settings ===');
  const sysSettings = await request('GET', '/api/systemSettings:get', null, token);
  if (sysSettings.status === 200) {
    console.log('Logo:', sysSettings.data.data?.logo ? 'set' : 'not set');
    console.log('Title:', sysSettings.data.data?.title);
    console.log('Enabled Languages:', sysSettings.data.data?.enabledLanguages);
  }

  // 8. Check for any errors in the error logs or application state
  console.log('\n=== Application State ===');
  const appState = await request('GET', '/api/app:getInfo', null, token);
  console.log('App info status:', appState.status);
  if (appState.status === 200) {
    console.log('Version:', appState.data.data?.version);
    console.log('Lang:', appState.data.data?.lang);
  }

  // 9. Check if there are any pending migrations or issues
  console.log('\n=== Health Check ===');
  const health = await request('GET', '/api/health', null, null);
  console.log('Health status:', health.status);

  // 10. Verify route-role associations
  console.log('\n=== Route-Role Associations ===');
  const routeAssociations = await request('GET', '/api/rolesDesktopRoutes:list?paginate=false', null, token);
  console.log('Total associations:', routeAssociations.data.data?.length || 0);

  // Group by role
  const byRole = {};
  routeAssociations.data.data?.forEach(a => {
    if (!byRole[a.roleName]) byRole[a.roleName] = [];
    byRole[a.roleName].push(a.desktopRouteId);
  });
  console.log('By role:', Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.length])));

  console.log('\n=== Diagnostic Complete ===');
}

main().catch(console.error);
