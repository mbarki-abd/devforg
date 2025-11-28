import { test, expect } from '@playwright/test';

test('Take screenshot of current state', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMessages.push(`[PAGE ERROR] ${err.message}`));

  // Go to homepage
  await page.goto('https://devforge.ilinqsoft.com/', { waitUntil: 'networkidle' });

  // Wait a bit for page to load
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/01-homepage.png',
    fullPage: true
  });

  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  // Check what's on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Body text preview:', bodyText?.substring(0, 500));

  // Check if we're on login page
  const hasLoginForm = await page.locator('input[type="password"], form').count() > 0;
  console.log('Has login form:', hasLoginForm);

  // If on login page, try to login
  if (hasLoginForm) {
    console.log('Attempting login...');

    // Fill login form
    const accountInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]');

    await accountInput.fill('admin@nocobase.com');
    await passwordInput.fill('admin123');

    // Screenshot before login
    await page.screenshot({
      path: 'screenshots/02-login-filled.png',
      fullPage: true
    });

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first();
    await submitButton.click();

    // Wait for navigation
    await page.waitForTimeout(10000);

    // Screenshot after login
    await page.screenshot({
      path: 'screenshots/03-after-login.png',
      fullPage: true
    });

    console.log('After login URL:', page.url());
  }

  // Final screenshot
  await page.screenshot({
    path: 'screenshots/04-final-state.png',
    fullPage: true
  });

  // Check for any error messages
  const errorMessages = await page.locator('.ant-message-error, .error, [class*="error"]').allTextContents();
  if (errorMessages.length > 0) {
    console.log('Error messages found:', errorMessages);
  }

  // Check for "No pages" message
  const noPages = await page.locator('text="No pages yet"').count();
  console.log('Has "No pages yet" message:', noPages > 0);

  // Check for ant-layout
  const hasLayout = await page.locator('.ant-layout').count();
  console.log('Has ant-layout:', hasLayout > 0);

  // Check for menu
  const hasMenu = await page.locator('.ant-menu').count();
  console.log('Has ant-menu:', hasMenu > 0);

  // Check for menu-related elements
  const hasSider = await page.locator('.ant-layout-sider').count();
  const hasHeader = await page.locator('.ant-layout-header').count();
  const menuItems = await page.locator('.ant-menu-item, .ant-menu-submenu').count();
  console.log('Has ant-layout-sider:', hasSider > 0);
  console.log('Has ant-layout-header:', hasHeader > 0);
  console.log('Menu items count:', menuItems);

  // Get HTML structure
  const bodyHtml = await page.locator('body').innerHTML();
  console.log('\n=== BODY HTML (first 2000 chars) ===');
  console.log(bodyHtml.substring(0, 2000));

  // Get all visible text
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== ALL PAGE TEXT ===\n');
  console.log(allText.substring(0, 2000));

  // Print captured console messages
  console.log('\n=== BROWSER CONSOLE ===');
  consoleMessages.forEach(msg => console.log(msg));
});
