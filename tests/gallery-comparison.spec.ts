import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Gallery Page Comparison', () => {
  const screenshotDir = path.join(__dirname, '../test-results/gallery-screenshots');

  test.beforeAll(() => {
    // Create screenshot directory
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Compare original HTML and Astro version', async ({ page }) => {
    // Test Original HTML version
    await test.step('Test Original HTML Gallery', async () => {
      await page.goto('http://localhost:8000/gallery.html');
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotDir, 'original-gallery.png'),
        fullPage: true
      });

      // Check for JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        errors.push(err.message);
      });

      console.log('\n=== ORIGINAL HTML GALLERY ===');

      // Check page structure
      const originalTitle = await page.title();
      console.log(`Title: ${originalTitle}`);

      // Check filter panel
      const filterPanel = await page.locator('aside').first();
      const hasFilterPanel = await filterPanel.count() > 0;
      console.log(`Filter Panel exists: ${hasFilterPanel}`);

      if (hasFilterPanel) {
        const filterPanelVisible = await filterPanel.isVisible();
        console.log(`Filter Panel visible: ${filterPanelVisible}`);
      }

      // Check gallery grid
      const galleryGrid = await page.locator('#gallery-container').first();
      const hasGalleryGrid = await galleryGrid.count() > 0;
      console.log(`Gallery Grid exists: ${hasGalleryGrid}`);

      if (hasGalleryGrid) {
        const galleryVisible = await galleryGrid.isVisible();
        console.log(`Gallery Grid visible: ${galleryVisible}`);
      }

      // Count post cards (look for <a> tags with href containing detail.html)
      const postCards = await page.locator('a[href*="detail.html"]').count();
      console.log(`Post cards found: ${postCards}`);

      // Check for filter buttons
      const filterButtons = await page.locator('.filter-btn').count();
      console.log(`Filter buttons found: ${filterButtons}`);

      // Get DOM structure
      const bodyHTML = await page.locator('body').innerHTML();
      fs.writeFileSync(
        path.join(screenshotDir, 'original-structure.html'),
        bodyHTML
      );

      console.log(`JavaScript Errors: ${errors.length > 0 ? errors.join(', ') : 'None'}`);
    });

    // Test Astro version
    await test.step('Test Astro Gallery', async () => {
      await page.goto('http://localhost:4321/gallery');
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotDir, 'astro-gallery.png'),
        fullPage: true
      });

      // Check for JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        errors.push(err.message);
      });

      console.log('\n=== ASTRO GALLERY ===');

      // Check page structure
      const astroTitle = await page.title();
      console.log(`Title: ${astroTitle}`);

      // Check filter panel
      const filterPanel = await page.locator('aside').first();
      const hasFilterPanel = await filterPanel.count() > 0;
      console.log(`Filter Panel exists: ${hasFilterPanel}`);

      if (hasFilterPanel) {
        const filterPanelVisible = await filterPanel.isVisible();
        console.log(`Filter Panel visible: ${filterPanelVisible}`);
      }

      // Check gallery grid
      const galleryGrid = await page.locator('#gallery-container').first();
      const hasGalleryGrid = await galleryGrid.count() > 0;
      console.log(`Gallery Grid exists: ${hasGalleryGrid}`);

      if (hasGalleryGrid) {
        const galleryVisible = await galleryGrid.isVisible();
        console.log(`Gallery Grid visible: ${galleryVisible}`);
      }

      // Count post cards (look for <a> tags with href containing detail.html)
      const postCards = await page.locator('a[href*="detail.html"]').count();
      console.log(`Post cards found: ${postCards}`);

      // Check for filter buttons
      const filterButtons = await page.locator('.filter-btn').count();
      console.log(`Filter buttons found: ${filterButtons}`);

      // Get DOM structure
      const bodyHTML = await page.locator('body').innerHTML();
      fs.writeFileSync(
        path.join(screenshotDir, 'astro-structure.html'),
        bodyHTML
      );

      console.log(`JavaScript Errors: ${errors.length > 0 ? errors.join(', ') : 'None'}`);
    });

    // Test filter functionality on Astro version
    await test.step('Test Filter Functionality', async () => {
      await page.goto('http://localhost:4321/gallery');
      await page.waitForLoadState('networkidle');

      console.log('\n=== FILTER FUNCTIONALITY TEST ===');

      // Try to find and click a filter button
      const filterButton = page.locator('.filter-btn[data-filter-type="category"][data-filter-value="bifurcatum"]').first();
      const hasFilterButtons = await filterButton.count() > 0;

      if (hasFilterButtons) {
        const beforeCount = await page.locator('a[href*="detail.html"]').count();
        console.log(`Posts before filter: ${beforeCount}`);

        await filterButton.click();
        await page.waitForTimeout(500); // Wait for filter animation

        const afterCount = await page.locator('a[href*="detail.html"]').count();
        console.log(`Posts after filter: ${afterCount}`);
        console.log(`Filter working: ${beforeCount !== afterCount ? 'Yes' : 'No change'}`);
      } else {
        console.log('No filter buttons found to test');
      }
    });

    // Test infinite scroll on Astro version
    await test.step('Test Infinite Scroll', async () => {
      await page.goto('http://localhost:4321/gallery');
      await page.waitForLoadState('networkidle');

      console.log('\n=== INFINITE SCROLL TEST ===');

      const initialCount = await page.locator('a[href*="detail.html"]').count();
      console.log(`Initial posts: ${initialCount}`);

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      const afterScrollCount = await page.locator('a[href*="detail.html"]').count();
      console.log(`Posts after scroll: ${afterScrollCount}`);
      console.log(`Infinite scroll working: ${afterScrollCount > initialCount ? 'Yes' : 'No'}`);
    });
  });

  test('Check Console Errors', async ({ page }) => {
    const originalErrors: string[] = [];
    const astroErrors: string[] = [];

    // Check original HTML
    page.on('pageerror', (err) => originalErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        originalErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:8000/gallery.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== ORIGINAL HTML CONSOLE ERRORS ===');
    if (originalErrors.length > 0) {
      originalErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('  No errors found');
    }

    // Reset error listeners
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');

    // Check Astro version
    page.on('pageerror', (err) => astroErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        astroErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:4321/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== ASTRO CONSOLE ERRORS ===');
    if (astroErrors.length > 0) {
      astroErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('  No errors found');
    }

    // Save error report
    const errorReport = {
      original: originalErrors,
      astro: astroErrors,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(screenshotDir, 'error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );
  });
});
