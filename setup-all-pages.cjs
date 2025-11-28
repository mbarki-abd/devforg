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
  console.log('Token obtained:', token.substring(0, 20) + '...');

  // First, check if devforge-main-menu exists
  console.log('\nChecking existing menu structure...');
  const menuCheck = await request('GET', '/api/uiSchemas:getJsonSchema/nocobase-admin-menu', null, token);

  let devforgeMenuUid = null;
  if (menuCheck.data?.properties) {
    for (const [key, value] of Object.entries(menuCheck.data.properties)) {
      if (value.title === 'DevForge' || value['x-uid'] === 'devforge-main-menu') {
        devforgeMenuUid = value['x-uid'];
        console.log('Found existing DevForge menu:', devforgeMenuUid);
        break;
      }
    }
  }

  // If DevForge menu doesn't exist, create it
  if (!devforgeMenuUid) {
    console.log('\nCreating DevForge menu...');
    const menuResponse = await request('POST', '/api/uiSchemas:insertAdjacent/nocobase-admin-menu?position=beforeEnd', {
      schema: {
        type: 'void',
        title: 'DevForge',
        'x-component': 'Menu.SubMenu',
        'x-decorator': 'ACLMenuItemProvider',
        'x-component-props': { icon: 'RocketOutlined' },
        'x-uid': 'devforge-main-menu',
        'x-server-hooks': [{ type: 'onSelfCreate', method: 'bindMenuItemToRole' }],
        properties: {}
      }
    }, token);

    devforgeMenuUid = menuResponse.data?.['x-uid'] || 'devforge-main-menu';
    console.log('Created DevForge menu:', devforgeMenuUid);
  }

  // Page definitions
  const pages = [
    {
      name: 'projects',
      title: 'Projects',
      icon: 'FolderOutlined',
      collection: 'projects',
      fields: {
        name: { 'x-collection-field': 'projects.name', width: 200 },
        slug: { 'x-collection-field': 'projects.slug' },
        status: { 'x-collection-field': 'projects.status' },
        repositoryUrl: { 'x-collection-field': 'projects.repositoryUrl' },
        createdAt: { 'x-collection-field': 'projects.createdAt' }
      }
    },
    {
      name: 'agents',
      title: 'Agents',
      icon: 'RobotOutlined',
      collection: 'agents',
      fields: {
        name: { 'x-collection-field': 'agents.name', width: 200 },
        type: { 'x-collection-field': 'agents.type' },
        status: { 'x-collection-field': 'agents.status' },
        endpoint: { 'x-collection-field': 'agents.endpoint' },
        lastHealthCheck: { 'x-collection-field': 'agents.lastHealthCheck' }
      }
    },
    {
      name: 'workflows',
      title: 'Workflows',
      icon: 'BranchesOutlined',
      collection: 'devforge_workflows',
      fields: {
        name: { 'x-collection-field': 'devforge_workflows.name', width: 200 },
        trigger: { 'x-collection-field': 'devforge_workflows.trigger' },
        enabled: { 'x-collection-field': 'devforge_workflows.enabled' },
        createdAt: { 'x-collection-field': 'devforge_workflows.createdAt' }
      }
    },
    {
      name: 'credentials',
      title: 'Credentials',
      icon: 'KeyOutlined',
      collection: 'credentials',
      fields: {
        name: { 'x-collection-field': 'credentials.name', width: 200 },
        type: { 'x-collection-field': 'credentials.type' },
        description: { 'x-collection-field': 'credentials.description' },
        expiresAt: { 'x-collection-field': 'credentials.expiresAt' }
      }
    },
    {
      name: 'executions',
      title: 'Executions',
      icon: 'ThunderboltOutlined',
      collection: 'executions',
      fields: {
        agentType: { 'x-collection-field': 'executions.agentType' },
        status: { 'x-collection-field': 'executions.status' },
        startedAt: { 'x-collection-field': 'executions.startedAt' },
        finishedAt: { 'x-collection-field': 'executions.finishedAt' },
        duration: { 'x-collection-field': 'executions.duration' }
      }
    }
  ];

  // Create each page
  for (const page of pages) {
    console.log(`\nCreating ${page.title} page...`);

    // Build table columns
    const tableColumns = {};
    for (const [fieldName, fieldConfig] of Object.entries(page.fields)) {
      tableColumns[fieldName] = {
        type: 'void',
        'x-decorator': 'TableV2.Column.Decorator',
        'x-component': 'TableV2.Column',
        'x-component-props': fieldConfig.width ? { width: fieldConfig.width } : undefined,
        properties: {
          [fieldName]: {
            'x-collection-field': fieldConfig['x-collection-field'],
            'x-component': 'CollectionField',
            'x-read-pretty': true
          }
        }
      };
    }

    const pageSchema = {
      schema: {
        type: 'void',
        title: page.title,
        'x-component': 'Menu.Item',
        'x-decorator': 'ACLMenuItemProvider',
        'x-component-props': { icon: page.icon },
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
                properties: {
                  row1: {
                    type: 'void',
                    'x-component': 'Grid.Row',
                    properties: {
                      col1: {
                        type: 'void',
                        'x-component': 'Grid.Col',
                        properties: {
                          block: {
                            type: 'void',
                            'x-decorator': 'TableBlockProvider',
                            'x-acl-action': `${page.collection}:list`,
                            'x-decorator-props': {
                              collection: page.collection,
                              dataSource: 'main',
                              action: 'list',
                              params: { pageSize: 20 },
                              rowKey: 'id',
                              showIndex: true,
                              dragSort: false
                            },
                            'x-component': 'CardItem',
                            'x-component-props': { title: page.title },
                            properties: {
                              actions: {
                                type: 'void',
                                'x-component': 'ActionBar',
                                'x-component-props': { style: { marginBottom: 16 } },
                                properties: {
                                  filter: {
                                    type: 'void',
                                    title: '{{t("Filter")}}',
                                    'x-action': 'filter',
                                    'x-component': 'Filter.Action',
                                    'x-use-component-props': 'useFilterActionProps',
                                    'x-component-props': { icon: 'FilterOutlined' },
                                    'x-align': 'left'
                                  },
                                  refresh: {
                                    type: 'void',
                                    title: '{{t("Refresh")}}',
                                    'x-action': 'refresh',
                                    'x-component': 'Action',
                                    'x-use-component-props': 'useRefreshActionProps',
                                    'x-component-props': { icon: 'ReloadOutlined' },
                                    'x-align': 'left'
                                  },
                                  create: {
                                    type: 'void',
                                    title: '{{t("Add new")}}',
                                    'x-action': 'create',
                                    'x-component': 'Action',
                                    'x-component-props': { type: 'primary', icon: 'PlusOutlined', openMode: 'drawer' },
                                    'x-align': 'right',
                                    properties: {
                                      drawer: {
                                        type: 'void',
                                        title: `Add ${page.title}`,
                                        'x-component': 'Action.Container',
                                        'x-component-props': { className: 'nb-action-popup' },
                                        properties: {
                                          grid: {
                                            type: 'void',
                                            'x-component': 'Grid',
                                            'x-initializer': 'popup:addNew:addBlock',
                                            properties: {}
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              table: {
                                type: 'array',
                                'x-component': 'TableV2',
                                'x-use-component-props': 'useTableBlockProps',
                                'x-component-props': {
                                  rowKey: 'id',
                                  rowSelection: { type: 'checkbox' }
                                },
                                properties: tableColumns
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const response = await request('POST', `/api/uiSchemas:insertAdjacent/${devforgeMenuUid}?position=beforeEnd`, pageSchema, token);

    if (response.data?.['x-uid']) {
      console.log(`  Created: ${response.data['x-uid']}`);
    } else if (response.errors) {
      console.log(`  Error: ${JSON.stringify(response.errors)}`);
    } else {
      console.log(`  Response: ${JSON.stringify(response).substring(0, 100)}`);
    }
  }

  console.log('\n==========================================');
  console.log('DevForge setup complete!');
  console.log('==========================================');
  console.log('Visit: https://devforge.ilinqsoft.com');
  console.log('Login: admin@nocobase.com / admin123');
}

main().catch(console.error);
