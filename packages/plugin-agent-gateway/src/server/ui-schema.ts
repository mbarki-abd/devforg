/**
 * DevForge UI Schema definitions
 * These schemas define the menu and pages created when the plugin is installed
 */

// Helper to create a table block schema for a collection
const createTableBlock = (collection: string, title: string) => ({
  type: 'void',
  'x-decorator': 'TableBlockProvider',
  'x-decorator-props': {
    collection,
    action: 'list',
    params: { pageSize: 20 },
    rowKey: 'id',
    showIndex: true,
    dragSort: false,
  },
  'x-component': 'CardItem',
  'x-component-props': { title },
  properties: {
    actions: {
      type: 'void',
      'x-component': 'ActionBar',
      'x-component-props': { style: { marginBottom: 16 } },
      properties: {
        filter: {
          type: 'void',
          title: '{{ t("Filter") }}',
          'x-action': 'filter',
          'x-component': 'Filter.Action',
          'x-component-props': { icon: 'FilterOutlined', useProps: '{{ useFilterActionProps }}' },
        },
        refresh: {
          type: 'void',
          title: '{{ t("Refresh") }}',
          'x-action': 'refresh',
          'x-component': 'Action',
          'x-component-props': { icon: 'ReloadOutlined', useProps: '{{ useRefreshActionProps }}' },
        },
        create: {
          type: 'void',
          title: '{{ t("Add new") }}',
          'x-action': 'create',
          'x-component': 'Action',
          'x-component-props': {
            type: 'primary',
            icon: 'PlusOutlined',
            openMode: 'drawer',
          },
        },
      },
    },
    table: {
      type: 'array',
      'x-component': 'TableV2',
      'x-component-props': {
        rowSelection: { type: 'checkbox' },
        useProps: '{{ useTableBlockProps }}',
      },
    },
  },
});

// Helper to create a page schema
const createPageSchema = (uid: string, title: string, collection: string) => ({
  'x-uid': uid,
  type: 'void',
  title,
  'x-component': 'Menu.Item',
  'x-decorator': 'ACLMenuItemProvider',
  'x-component-props': {},
  'x-server-hooks': [{ type: 'onSelfCreate', method: 'bindMenuItemToRole' }],
  properties: {
    page: {
      type: 'void',
      'x-component': 'Page',
      'x-component-props': {},
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
                    block: createTableBlock(collection, title),
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

/**
 * DevForge main menu schema
 * This creates a submenu in the admin menu with all DevForge pages
 */
export const devforgeMenuSchema = {
  'x-uid': 'devforge-main-menu',
  type: 'void',
  title: 'DevForge',
  'x-component': 'Menu.SubMenu',
  'x-decorator': 'ACLMenuItemProvider',
  'x-component-props': {
    icon: 'RocketOutlined',
  },
  'x-server-hooks': [{ type: 'onSelfCreate', method: 'bindMenuItemToRole' }],
};

/**
 * DevForge pages - each page displays a collection table
 */
export const devforgePages = [
  createPageSchema('devforge-projects-page', 'Projects', 'projects'),
  createPageSchema('devforge-agents-page', 'Agents', 'agents'),
  createPageSchema('devforge-workflows-page', 'Workflows', 'devforge_workflows'),
  createPageSchema('devforge-credentials-page', 'Credentials', 'credentials'),
  createPageSchema('devforge-executions-page', 'Executions', 'devforge_executions'),
];

/**
 * Complete UI schema for installation
 * This creates the DevForge menu as a child of the admin menu
 */
export const devforgeInstallSchema = {
  wrap: 'nocobase-admin-menu',
  schema: {
    ...devforgeMenuSchema,
    properties: {
      'devforge-projects-page': devforgePages[0],
      'devforge-agents-page': devforgePages[1],
      'devforge-workflows-page': devforgePages[2],
      'devforge-credentials-page': devforgePages[3],
      'devforge-executions-page': devforgePages[4],
    },
  },
};
