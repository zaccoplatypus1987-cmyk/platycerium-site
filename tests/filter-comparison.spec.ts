import { test, expect } from '@playwright/test';

test('Compare filter rendering between original and Astro versions', async ({ page }) => {
  // Take screenshot of original version (port 8000)
  await page.goto('http://localhost:8000/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(2000);

  // Take full page screenshot
  await page.screenshot({
    path: 'tests/screenshots/original-species-full.png',
    fullPage: true
  });

  // Take filter area screenshot
  const originalFilter = await page.locator('aside').first();
  if (await originalFilter.isVisible()) {
    await originalFilter.screenshot({
      path: 'tests/screenshots/original-filter-sidebar.png'
    });
  }

  // Take screenshot of Astro version (port 4321)
  await page.goto('http://localhost:4321/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({
    path: 'tests/screenshots/astro-species-full.png',
    fullPage: true
  });

  // Take filter area screenshot
  const astroFilter = await page.locator('aside').first();
  if (await astroFilter.isVisible()) {
    await astroFilter.screenshot({
      path: 'tests/screenshots/astro-filter-sidebar.png'
    });
  }

  console.log('Screenshots saved to tests/screenshots/');
  console.log('- original-species-full.png');
  console.log('- original-filter-sidebar.png');
  console.log('- astro-species-full.png');
  console.log('- astro-filter-sidebar.png');
});
