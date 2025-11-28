import { test, expect } from '@playwright/test';

test('Check what happens at /admin', async ({ page }) => {
  // Intercept network requests to see what's being fetched
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      requests.push(`${request.method()} ${request.url()}`);
    }
  });

  const responses: { url: string; status: number; body?: string }[] = [];
  page.on('response', async response => {
    if (response.url().includes('/api/uiSchemas') || response.url().includes('/api/roles')) {
      try {
        const body = await response.text();
        responses.push({ url: response.url(), status: response.status(), body: body.slice(0, 500) });
      } catch {
        responses.push({ url: response.url(), status: response.status() });
      }
    }
  });

  // Go to admin page
  await page.goto('https://devforge.ilinqsoft.com/admin');
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/admin-page-state.png', fullPage: true });

  // Get page HTML
  const html = await page.content();
  console.log('\n=== Page HTML (first 2000 chars) ===');
  console.log(html.slice(0, 2000));

  // Log API requests
  console.log('\n=== API Requests ===');
  requests.forEach(r => console.log(r));

  // Log key responses
  console.log('\n=== Key API Responses ===');
  responses.forEach(r => {
    console.log(`\n${r.url}`);
    console.log(`Status: ${r.status}`);
    if (r.body) console.log(`Body: ${r.body}`);
  });

  // Check for any JavaScript errors
  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  await page.waitForTimeout(2000);

  console.log('\n=== JavaScript Errors ===');
  errors.forEach(e => console.log(e));

  // Check console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
  });
  await page.reload();
  await page.waitForTimeout(3000);

  console.log('\n=== Console Logs ===');
  consoleLogs.forEach(l => console.log(l));
});
