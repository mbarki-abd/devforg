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

  // Create devforge_executions collection (renamed to avoid conflict with workflow plugin)
  console.log('Creating devforge_executions collection...');
  const createResponse = await request('POST', '/api/collections:create', {
    name: 'devforge_executions',
    title: 'DevForge Executions',
    autoGenId: true,
    createdBy: true,
    updatedBy: true,
    createdAt: true,
    updatedAt: true,
    sortable: true,
    fields: [
      {
        name: 'agentType',
        type: 'string',
        interface: 'input',
        uiSchema: {
          title: 'Agent Type',
          type: 'string',
          'x-component': 'Input'
        }
      },
      {
        name: 'status',
        type: 'string',
        interface: 'select',
        defaultValue: 'pending',
        uiSchema: {
          title: 'Status',
          type: 'string',
          'x-component': 'Select',
          enum: [
            { value: 'pending', label: 'Pending' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]
        }
      },
      {
        name: 'parameters',
        type: 'json',
        interface: 'json',
        defaultValue: {},
        uiSchema: {
          title: 'Parameters',
          type: 'object',
          'x-component': 'Input.JSON'
        }
      },
      {
        name: 'result',
        type: 'json',
        interface: 'json',
        defaultValue: {},
        uiSchema: {
          title: 'Result',
          type: 'object',
          'x-component': 'Input.JSON'
        }
      },
      {
        name: 'startedAt',
        type: 'date',
        interface: 'datetime',
        uiSchema: {
          title: 'Started At',
          type: 'string',
          'x-component': 'DatePicker',
          'x-component-props': { showTime: true }
        }
      },
      {
        name: 'finishedAt',
        type: 'date',
        interface: 'datetime',
        uiSchema: {
          title: 'Finished At',
          type: 'string',
          'x-component': 'DatePicker',
          'x-component-props': { showTime: true }
        }
      },
      {
        name: 'duration',
        type: 'integer',
        interface: 'integer',
        uiSchema: {
          title: 'Duration (ms)',
          type: 'number',
          'x-component': 'InputNumber'
        }
      }
    ]
  }, token);

  console.log('Create response:', JSON.stringify(createResponse, null, 2));

  if (createResponse.data?.name === 'devforge_executions') {
    console.log('\ndevforge_executions collection created successfully!');

    // Now add sample data
    console.log('\nCreating sample Executions...');
    const now = new Date();
    const executions = [
      { agentType: 'claude', status: 'completed', parameters: { prompt: 'Review code' }, result: { success: true }, startedAt: new Date(now - 3600000).toISOString(), finishedAt: new Date(now - 3500000).toISOString(), duration: 100000 },
      { agentType: 'shell', status: 'completed', parameters: { command: 'npm test' }, result: { exitCode: 0 }, startedAt: new Date(now - 7200000).toISOString(), finishedAt: new Date(now - 7100000).toISOString(), duration: 100000 },
      { agentType: 'docker', status: 'failed', parameters: { image: 'node:18' }, result: { error: 'Image not found' }, startedAt: new Date(now - 10800000).toISOString(), finishedAt: new Date(now - 10750000).toISOString(), duration: 50000 },
      { agentType: 'git', status: 'running', parameters: { repo: 'devforge-core', action: 'clone' }, result: {}, startedAt: new Date(now - 60000).toISOString() }
    ];

    for (const execution of executions) {
      const response = await request('POST', '/api/devforge_executions:create', execution, token);
      console.log(`  ${execution.agentType}: ${response.data?.id ? 'Created (id: ' + response.data.id + ')' : JSON.stringify(response.errors || response)}`);
    }

    // Now update the Executions page to use devforge_executions
    console.log('\nUpdating Executions page to use devforge_executions collection...');

    // First get the existing Executions page uid
    const menuResponse = await request('GET', '/api/uiSchemas:getJsonSchema/devforge-main-menu', null, token);

    // Find the executions page
    let executionsUid = null;
    if (menuResponse.data?.properties) {
      for (const [key, value] of Object.entries(menuResponse.data.properties)) {
        if (value.title === 'Executions') {
          executionsUid = value['x-uid'];
          break;
        }
      }
    }

    if (executionsUid) {
      console.log(`Found Executions page: ${executionsUid}`);

      // Delete the old page and recreate with correct collection
      await request('POST', `/api/uiSchemas:remove/${executionsUid}`, null, token);
      console.log('Deleted old Executions page');

      // Create new page with devforge_executions
      const pageResponse = await request('POST', '/api/uiSchemas:insertAdjacent/devforge-main-menu?position=beforeEnd', {
        schema: {
          type: 'void',
          title: 'Executions',
          'x-component': 'Menu.Item',
          'x-decorator': 'ACLMenuItemProvider',
          'x-component-props': { icon: 'ThunderboltOutlined' },
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
                              'x-acl-action': 'devforge_executions:list',
                              'x-decorator-props': {
                                collection: 'devforge_executions',
                                dataSource: 'main',
                                action: 'list',
                                params: { pageSize: 20 },
                                rowKey: 'id',
                                showIndex: true,
                                dragSort: false
                              },
                              'x-component': 'CardItem',
                              'x-component-props': { title: 'Executions' },
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
                                  properties: {
                                    agentType: {
                                      type: 'void',
                                      'x-decorator': 'TableV2.Column.Decorator',
                                      'x-component': 'TableV2.Column',
                                      properties: {
                                        agentType: {
                                          'x-collection-field': 'devforge_executions.agentType',
                                          'x-component': 'CollectionField',
                                          'x-read-pretty': true
                                        }
                                      }
                                    },
                                    status: {
                                      type: 'void',
                                      'x-decorator': 'TableV2.Column.Decorator',
                                      'x-component': 'TableV2.Column',
                                      properties: {
                                        status: {
                                          'x-collection-field': 'devforge_executions.status',
                                          'x-component': 'CollectionField',
                                          'x-read-pretty': true
                                        }
                                      }
                                    },
                                    startedAt: {
                                      type: 'void',
                                      'x-decorator': 'TableV2.Column.Decorator',
                                      'x-component': 'TableV2.Column',
                                      properties: {
                                        startedAt: {
                                          'x-collection-field': 'devforge_executions.startedAt',
                                          'x-component': 'CollectionField',
                                          'x-read-pretty': true
                                        }
                                      }
                                    },
                                    finishedAt: {
                                      type: 'void',
                                      'x-decorator': 'TableV2.Column.Decorator',
                                      'x-component': 'TableV2.Column',
                                      properties: {
                                        finishedAt: {
                                          'x-collection-field': 'devforge_executions.finishedAt',
                                          'x-component': 'CollectionField',
                                          'x-read-pretty': true
                                        }
                                      }
                                    },
                                    duration: {
                                      type: 'void',
                                      'x-decorator': 'TableV2.Column.Decorator',
                                      'x-component': 'TableV2.Column',
                                      properties: {
                                        duration: {
                                          'x-collection-field': 'devforge_executions.duration',
                                          'x-component': 'CollectionField',
                                          'x-read-pretty': true
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
              }
            }
          }
        }
      }, token);

      console.log(`Created new Executions page: ${pageResponse.data?.['x-uid'] || 'Error'}`);
    }
  }

  console.log('\n==========================================');
  console.log('Setup complete!');
  console.log('==========================================');
}

main().catch(console.error);
