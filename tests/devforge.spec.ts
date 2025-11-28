import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://devforge.ilinqsoft.com';
const CREDENTIALS = {
  account: 'admin@nocobase.com',
  password: 'admin123',
};

// Helper function to login
async function login(page: Page) {
  await page.goto('/');

  // Wait for login form or redirect to admin
  await page.waitForLoadState('networkidle');

  // Check if already logged in
  const currentUrl = page.url();
  if (currentUrl.includes('/admin')) {
    console.log('Already logged in');
    return;
  }

  // Fill login form
  await page.waitForSelector('input[name="account"], input[type="text"]', { timeout: 10000 });

  // Try different selectors for account input
  const accountInput = page.locator('input[name="account"]').or(page.locator('input[placeholder*="mail"]')).or(page.locator('input[type="text"]').first());
  await accountInput.fill(CREDENTIALS.account);

  // Password input
  const passwordInput = page.locator('input[name="password"]').or(page.locator('input[type="password"]'));
  await passwordInput.fill(CREDENTIALS.password);

  // Submit
  const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Sign in")'));
  await submitButton.click();

  // Wait for redirect to admin
  await page.waitForURL('**/admin/**', { timeout: 15000 });
  console.log('Login successful, redirected to:', page.url());
}

test.describe('DevForge NocoBase E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Dashboard is visible after login', async ({ page }) => {
    // Wait for the admin layout to load
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/01-dashboard-after-login.png', fullPage: true });

    // Check for menu
    const hasMenu = await page.locator('.ant-menu').count() > 0;
    expect(hasMenu).toBeTruthy();

    // Check for sidebar or layout sider
    const hasSider = await page.locator('.ant-layout-sider, .ant-menu-root').count() > 0;
    console.log('Has sider/menu:', hasSider);

    // Check if there are menu items
    const menuItems = await page.locator('.ant-menu-item, .ant-menu-submenu').count();
    console.log('Menu items count:', menuItems);
    expect(menuItems).toBeGreaterThan(0);
  });

  test('2. DevForge menu is visible in navigation', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Look for DevForge in the menu
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge"), .ant-menu-item:has-text("DevForge")');

    // Take screenshot before checking
    await page.screenshot({ path: 'test-results/02-devforge-menu.png', fullPage: true });

    // Check if DevForge menu exists
    const devforgeExists = await devforgeMenu.count() > 0;
    console.log('DevForge menu exists:', devforgeExists);

    if (devforgeExists) {
      // Click on DevForge to expand
      await devforgeMenu.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/02-devforge-menu-expanded.png', fullPage: true });
    }

    expect(devforgeExists).toBeTruthy();
  });

  test('3. Dashboard menu item exists', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Look for Dashboard in menu
    const dashboardMenu = page.locator('.ant-menu-item:has-text("Dashboard")');
    const dashboardExists = await dashboardMenu.count() > 0;
    console.log('Dashboard menu exists:', dashboardExists);

    await page.screenshot({ path: 'test-results/03-dashboard-menu.png', fullPage: true });

    expect(dashboardExists).toBeTruthy();
  });

  test('4. Navigate to Projects page', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Expand DevForge menu first
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge")');
    if (await devforgeMenu.count() > 0) {
      await devforgeMenu.click();
      await page.waitForTimeout(500);
    }

    // Click on Projects
    const projectsLink = page.locator('.ant-menu-item:has-text("Projects")');
    if (await projectsLink.count() > 0) {
      await projectsLink.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/04-projects-page.png', fullPage: true });

    // Check for table or card content
    const hasContent = await page.locator('.ant-table, .ant-card, .nb-block-item').count() > 0;
    console.log('Projects page has content:', hasContent);
  });

  test('5. Navigate to Agents page', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Expand DevForge menu
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge")');
    if (await devforgeMenu.count() > 0) {
      await devforgeMenu.click();
      await page.waitForTimeout(500);
    }

    // Click on Agents
    const agentsLink = page.locator('.ant-menu-item:has-text("Agents")');
    if (await agentsLink.count() > 0) {
      await agentsLink.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/05-agents-page.png', fullPage: true });
  });

  test('6. Navigate to Workflows page', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Expand DevForge menu
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge")');
    if (await devforgeMenu.count() > 0) {
      await devforgeMenu.click();
      await page.waitForTimeout(500);
    }

    // Click on Workflows
    const workflowsLink = page.locator('.ant-menu-item:has-text("Workflows")');
    if (await workflowsLink.count() > 0) {
      await workflowsLink.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/06-workflows-page.png', fullPage: true });
  });

  test('7. Navigate to Credentials page', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Expand DevForge menu
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge")');
    if (await devforgeMenu.count() > 0) {
      await devforgeMenu.click();
      await page.waitForTimeout(500);
    }

    // Click on Credentials
    const credentialsLink = page.locator('.ant-menu-item:has-text("Credentials")');
    if (await credentialsLink.count() > 0) {
      await credentialsLink.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/07-credentials-page.png', fullPage: true });
  });

  test('8. Navigate to Executions page', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Expand DevForge menu
    const devforgeMenu = page.locator('.ant-menu-submenu:has-text("DevForge")');
    if (await devforgeMenu.count() > 0) {
      await devforgeMenu.click();
      await page.waitForTimeout(500);
    }

    // Click on Executions
    const executionsLink = page.locator('.ant-menu-item:has-text("Executions")');
    if (await executionsLink.count() > 0) {
      await executionsLink.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/08-executions-page.png', fullPage: true });
  });

  test('9. Check page layout is properly rendered (not "No pages yet")', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Check for "No pages yet" message which indicates misconfiguration
    const noPages = await page.locator('text="No pages yet"').count();
    const configFirst = await page.locator('text="please configure first"').count();

    await page.screenshot({ path: 'test-results/09-page-layout-check.png', fullPage: true });

    console.log('Has "No pages yet" message:', noPages > 0);
    console.log('Has "configure first" message:', configFirst > 0);

    // These should NOT exist - means the pages are properly configured
    expect(noPages).toBe(0);
    expect(configFirst).toBe(0);
  });

  test('10. Verify all menu items are accessible', async ({ page }) => {
    await page.waitForSelector('.ant-layout', { timeout: 15000 });

    // Get all menu items
    const menuItems = page.locator('.ant-menu-item');
    const menuCount = await menuItems.count();
    console.log('Total menu items found:', menuCount);

    // Get all submenu items
    const subMenus = page.locator('.ant-menu-submenu');
    const subMenuCount = await subMenus.count();
    console.log('Total submenus found:', subMenuCount);

    await page.screenshot({ path: 'test-results/10-all-menu-items.png', fullPage: true });

    // Should have at least Dashboard and DevForge
    expect(menuCount + subMenuCount).toBeGreaterThanOrEqual(2);
  });

});

test.describe('Plugin Auto-Configuration Tests', () => {

  test('Verify desktopRoutes exist via API', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${BASE_URL}/api/auth:signIn`, {
      data: CREDENTIALS,
    });

    const loginData = await loginResponse.json();
    const token = loginData.data?.token;
    expect(token).toBeTruthy();

    // Check desktop routes
    const routesResponse = await request.get(`${BASE_URL}/api/desktopRoutes:list?paginate=false`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const routesData = await routesResponse.json();
    console.log('Desktop routes:', routesData.data?.length || 0);

    expect(routesData.data).toBeDefined();
    expect(routesData.data.length).toBeGreaterThan(0);

    // Verify specific routes exist
    const routeTitles = routesData.data.map((r: any) => r.title);
    console.log('Route titles:', routeTitles);

    expect(routeTitles).toContain('DevForge');
  });

  test('Verify menu schemas exist via API', async ({ request }) => {
    const loginResponse = await request.post(`${BASE_URL}/api/auth:signIn`, {
      data: CREDENTIALS,
    });

    const loginData = await loginResponse.json();
    const token = loginData.data?.token;

    // Check menu schema
    const menuResponse = await request.get(`${BASE_URL}/api/uiSchemas:getJsonSchema/nocobase-admin-menu`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const menuData = await menuResponse.json();
    const menuProperties = menuData.data?.properties || {};
    const menuItemCount = Object.keys(menuProperties).length;

    console.log('Menu items:', menuItemCount);
    console.log('Menu item names:', Object.values(menuProperties).map((p: any) => p.title));

    expect(menuItemCount).toBeGreaterThan(0);
  });

  test('Verify collections exist via API', async ({ request }) => {
    const loginResponse = await request.post(`${BASE_URL}/api/auth:signIn`, {
      data: CREDENTIALS,
    });

    const loginData = await loginResponse.json();
    const token = loginData.data?.token;

    const collections = ['projects', 'agents', 'credentials', 'devforge_workflows', 'devforge_executions'];

    for (const collection of collections) {
      const response = await request.get(`${BASE_URL}/api/${collection}:list?pageSize=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log(`Collection ${collection}: ${data.data?.length || 0} records, status: ${response.status()}`);

      expect(response.status()).toBe(200);
    }
  });

});
