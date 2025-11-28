import { test, expect } from '@playwright/test';

test('Login and check admin page', async ({ page }) => {
  // Intercept key API responses
  const apiResponses: { url: string; status: number; body?: string }[] = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/uiSchemas') ||
        url.includes('/api/roles:check') ||
        url.includes('/api/desktopRoutes') ||
        url.includes('/api/auth')) {
      try {
        const body = await response.text();
        apiResponses.push({ url, status: response.status(), body: body.slice(0, 1000) });
      } catch {
        apiResponses.push({ url, status: response.status() });
      }
    }
  });

  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Go to signin page
  console.log('1. Navigating to signin page...');
  await page.goto('https://devforge.ilinqsoft.com/signin');
  await page.waitForTimeout(2000);

  // Take screenshot of login page
  await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });

  // Fill in credentials
  console.log('2. Filling credentials...');
  await page.fill('input[placeholder*="Username"], input[placeholder*="Email"], input[name="account"]', 'admin@nocobase.com');
  await page.fill('input[type="password"], input[name="password"]', 'admin123');

  // Take screenshot before clicking sign in
  await page.screenshot({ path: 'test-results/02-credentials-filled.png', fullPage: true });

  // Click sign in
  console.log('3. Clicking sign in...');
  await page.click('button:has-text("Sign in")');

  // Wait for navigation
  console.log('4. Waiting for navigation...');
  await page.waitForTimeout(5000);

  // Take screenshot after login
  await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true });

  // Check current URL
  console.log('Current URL:', page.url());

  // Wait more if still on signin
  if (page.url().includes('signin')) {
    console.log('Still on signin page, waiting more...');
    await page.waitForTimeout(5000);
  }

  // Take another screenshot
  await page.screenshot({ path: 'test-results/04-admin-page.png', fullPage: true });

  // Get page HTML
  const html = await page.content();
  console.log('\n=== Page HTML (body content) ===');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (bodyMatch) {
    console.log(bodyMatch[1].slice(0, 3000));
  }

  // Check for specific elements
  console.log('\n=== Element Checks ===');
  const checks = [
    { name: 'ant-layout', selector: '.ant-layout' },
    { name: 'ant-menu', selector: '.ant-menu' },
    { name: 'ant-pro-layout', selector: '.ant-pro-layout' },
    { name: 'ant-pro-top-nav-header', selector: '.ant-pro-top-nav-header' },
    { name: 'nocobase-admin', selector: '[data-testid="nocobase-admin"]' },
    { name: 'error message', selector: '.ant-message-error, .ant-alert-error' },
    { name: 'login form', selector: 'input[type="password"]' }
  ];

  for (const check of checks) {
    const count = await page.locator(check.selector).count();
    console.log(`${check.name}: ${count > 0 ? 'FOUND' : 'NOT FOUND'} (${count})`);
  }

  // Log API responses
  console.log('\n=== Key API Responses ===');
  apiResponses.forEach(r => {
    console.log(`\n${r.url.split('?')[0]}`);
    console.log(`Status: ${r.status}`);
    if (r.body) {
      console.log(`Body: ${r.body.slice(0, 500)}`);
    }
  });

  // Log console errors
  console.log('\n=== Console Errors ===');
  consoleErrors.forEach(e => console.log(e));

  // Final check - get visible text
  console.log('\n=== Visible Text ===');
  const visibleText = await page.locator('body').textContent();
  console.log(visibleText?.slice(0, 1000));
});
