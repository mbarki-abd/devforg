import { test, expect } from '@playwright/test';

test('Check all API calls for menu rendering', async ({ page }) => {
  // Capture ALL API requests and responses
  const apiCalls: { method: string; url: string; status?: number; response?: string }[] = [];

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({ method: request.method(), url: request.url() });
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const call = apiCalls.find(c => c.url === url && !c.status);
      if (call) {
        call.status = response.status();
        try {
          const body = await response.text();
          call.response = body.slice(0, 2000);
        } catch {
          call.response = 'Could not read response';
        }
      }
    }
  });

  // Login first
  await page.goto('https://devforge.ilinqsoft.com/signin');
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Username"], input[placeholder*="Email"]', 'admin@nocobase.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(10000); // Wait longer for all API calls

  // Take screenshot
  await page.screenshot({ path: 'test-results/menu-check.png', fullPage: true });

  // Print all API calls
  console.log('\n=== All API Calls After Login ===');
  apiCalls.forEach(call => {
    console.log(`\n${call.method} ${call.url}`);
    console.log(`Status: ${call.status || 'pending'}`);
    if (call.response && (
      call.url.includes('uiSchema') ||
      call.url.includes('menu') ||
      call.url.includes('route') ||
      call.url.includes('roles')
    )) {
      console.log(`Response: ${call.response}`);
    }
  });

  // Specifically check for uiSchemas:getJsonSchema calls
  console.log('\n=== UI Schema API Calls ===');
  const uiSchemaCalls = apiCalls.filter(c => c.url.includes('uiSchemas'));
  uiSchemaCalls.forEach(call => {
    console.log(`\n${call.url}`);
    console.log(`Status: ${call.status}`);
    console.log(`Response: ${call.response}`);
  });

  // Check what element should contain the menu
  console.log('\n=== Menu Container HTML ===');
  const menuContainer = page.locator('.ant-pro-top-nav-header-menu');
  const menuHtml = await menuContainer.innerHTML();
  console.log('Menu container innerHTML:', menuHtml || 'EMPTY');

  // Check for any React errors in the DOM
  const errorBoundary = await page.locator('.ant-result-error, [class*="error"]').count();
  console.log('\nError elements found:', errorBoundary);
});
