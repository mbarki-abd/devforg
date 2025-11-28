import { test, expect } from '@playwright/test';

test('DevForge NocoBase - Check Dashboard and Menu', async ({ page }) => {
  // Go to login page
  await page.goto('https://devforge.ilinqsoft.com/admin');

  // Take screenshot of initial state
  await page.screenshot({ path: 'screenshots/01-initial.png', fullPage: true });

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/02-loaded.png', fullPage: true });

  // Check if we need to login
  const loginButton = page.locator('button:has-text("Sign in")');
  const emailInput = page.locator('input[type="text"], input[placeholder*="Email"], input[placeholder*="email"]');

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Login form found, logging in...');

    // Fill login form
    await emailInput.fill('admin@nocobase.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.screenshot({ path: 'screenshots/03-login-filled.png', fullPage: true });

    // Click sign in
    await page.locator('button[type="submit"], button:has-text("Sign in")').click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  }

  // Take screenshot after login
  await page.screenshot({ path: 'screenshots/04-after-login.png', fullPage: true });

  // Check for menu
  const menu = page.locator('.ant-menu, [class*="Menu"], nav');
  console.log('Menu visible:', await menu.isVisible().catch(() => false));

  // Check for sidebar
  const sidebar = page.locator('.ant-layout-sider, [class*="Sider"], aside');
  console.log('Sidebar visible:', await sidebar.isVisible().catch(() => false));

  // Look for DevForge text
  const devforgeText = page.locator('text=DevForge');
  console.log('DevForge text visible:', await devforgeText.isVisible().catch(() => false));

  // Look for Dashboard text
  const dashboardText = page.locator('text=Dashboard');
  console.log('Dashboard text visible:', await dashboardText.isVisible().catch(() => false));

  // Check for "No pages" message
  const noPagesMsg = page.locator('text=No pages yet');
  console.log('No pages message visible:', await noPagesMsg.isVisible().catch(() => false));

  // Check for UI Editor icon in top right
  const uiEditorIcon = page.locator('[class*="designer"], [aria-label*="UI"], button:has-text("UI")');
  console.log('UI Editor visible:', await uiEditorIcon.count());

  // Try clicking UI Editor if exists
  const designerButton = page.locator('button[class*="designer"], [class*="DesignableSwitch"]').first();
  if (await designerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Found designer button, clicking...');
    await designerButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/05-designer-mode.png', fullPage: true });
  }

  // Check page content
  const pageContent = await page.content();
  console.log('Page has menu component:', pageContent.includes('ant-menu'));
  console.log('Page has sider component:', pageContent.includes('ant-layout-sider'));

  // Final screenshot
  await page.screenshot({ path: 'screenshots/06-final.png', fullPage: true });

  // Get console logs
  page.on('console', msg => console.log('Browser console:', msg.text()));
});

test('DevForge NocoBase - Enable UI Editor Mode', async ({ page }) => {
  // Login
  await page.goto('https://devforge.ilinqsoft.com/admin');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="text"], input[placeholder*="Email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('admin@nocobase.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // Look for the UI Editor toggle (usually a switch/button in top right)
  await page.screenshot({ path: 'screenshots/07-before-ui-editor.png', fullPage: true });

  // Try to find and click the UI configuration button
  // NocoBase uses an icon button to toggle design mode
  const configButtons = page.locator('header button, .ant-btn').all();
  for (const btn of await configButtons) {
    const className = await btn.getAttribute('class') || '';
    const ariaLabel = await btn.getAttribute('aria-label') || '';
    console.log('Button:', className, ariaLabel);
  }

  // Click the settings/design icon (usually has a paintbrush or design icon)
  const designIcon = page.locator('svg[class*="icon"], .anticon').filter({ hasText: '' });
  console.log('Found icons:', await designIcon.count());

  // Take final screenshot
  await page.screenshot({ path: 'screenshots/08-ui-elements.png', fullPage: true });
});
