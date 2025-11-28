const { chromium } = require('playwright');
const path = require('path');

async function main() {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('Loading DevForge...');
    await page.goto('https://devforge.ilinqsoft.com', { timeout: 60000 });
    await page.waitForTimeout(3000);

    // Take screenshot of login page
    await page.screenshot({ path: 'screenshot-01-login.png' });
    console.log('Screenshot 01: Login page');

    // Login
    console.log('Logging in...');
    await page.fill('input[name="account"]', 'admin@nocobase.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(5000);

    // Take screenshot after login
    await page.screenshot({ path: 'screenshot-02-after-login.png' });
    console.log('Screenshot 02: After login');

    // Check for menu elements
    const hasMenu = await page.locator('.ant-menu').count() > 0;
    const hasSider = await page.locator('.ant-layout-sider').count() > 0;
    const hasDevForge = await page.getByText('DevForge').count() > 0;
    const hasDashboard = await page.getByText('Dashboard').count() > 0;

    console.log('\n=== UI Check Results ===');
    console.log(`Has ant-menu: ${hasMenu}`);
    console.log(`Has ant-layout-sider: ${hasSider}`);
    console.log(`Has Dashboard: ${hasDashboard}`);
    console.log(`Has DevForge: ${hasDevForge}`);

    // Get page content for analysis
    const bodyText = await page.locator('body').textContent();
    console.log('\nPage text contains:');
    console.log(`  "No pages yet": ${bodyText.includes('No pages yet')}`);
    console.log(`  "Dashboard": ${bodyText.includes('Dashboard')}`);
    console.log(`  "DevForge": ${bodyText.includes('DevForge')}`);

    // If DevForge is visible, try to click it
    if (hasDevForge) {
      console.log('\nClicking DevForge menu...');
      await page.getByText('DevForge').first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshot-03-devforge.png' });
      console.log('Screenshot 03: DevForge submenu');
    }

    // Final full page screenshot
    await page.screenshot({ path: 'screenshot-04-final.png', fullPage: true });
    console.log('Screenshot 04: Final full page');

    console.log('\n=== Test Complete ===');
    console.log('Screenshots saved in current directory');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshot-error.png' });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
