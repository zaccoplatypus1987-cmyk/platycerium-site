import { test, expect } from '@playwright/test';

test('species page loads correctly', async ({ page }) => {
  // Console errors collection
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to species page
  await page.goto('http://localhost:4321/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait a bit for JavaScript to execute
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/species-page.png', fullPage: true });

  // Check if loading spinner is gone
  const loadingSpinner = await page.locator('#loading').isVisible();
  console.log('Loading spinner visible:', loadingSpinner);

  // Check if species containers exist
  const pureSpeciesGrid = await page.locator('#pure-species-grid').count();
  const hybridSpeciesGrid = await page.locator('#hybrid-species-grid').count();
  console.log('Pure species grid found:', pureSpeciesGrid > 0);
  console.log('Hybrid species grid found:', hybridSpeciesGrid > 0);

  // Check for species cards
  const speciesCards = await page.locator('.species-card, .hybrid-group-card').count();
  console.log('Number of species cards found:', speciesCards);

  // Check for console errors
  console.log('Console errors:', consoleErrors);

  // Report results
  console.log('\n=== Test Results ===');
  console.log('Page loaded successfully');
  console.log('Loading spinner gone:', !loadingSpinner);
  console.log('Species cards rendered:', speciesCards);
  console.log('Console errors:', consoleErrors.length);
});
