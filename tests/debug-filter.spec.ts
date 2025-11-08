import { test, expect } from '@playwright/test';

test('Debug filter accordion state', async ({ page }) => {
  // Navigate to Astro version
  await page.goto('http://localhost:4321/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Check accordion elements
  const accordions = await page.locator('.accordion-content').all();

  console.log(`\n=== Found ${accordions.length} accordion elements ===\n`);

  for (let i = 0; i < accordions.length; i++) {
    const accordion = accordions[i];
    const id = await accordion.getAttribute('id');
    const maxHeight = await accordion.evaluate(el => (el as HTMLElement).style.maxHeight);
    const computedOverflow = await accordion.evaluate(el => window.getComputedStyle(el).overflow);
    const computedMaxHeight = await accordion.evaluate(el => window.getComputedStyle(el).maxHeight);
    const isVisible = await accordion.isVisible();
    const boundingBox = await accordion.boundingBox();

    console.log(`Accordion ${i + 1}: ${id}`);
    console.log(`  - inline maxHeight: "${maxHeight}"`);
    console.log(`  - computed maxHeight: "${computedMaxHeight}"`);
    console.log(`  - computed overflow: "${computedOverflow}"`);
    console.log(`  - isVisible: ${isVisible}`);
    console.log(`  - boundingBox height: ${boundingBox?.height || 0}px\n`);
  }

  // Check if subspecies items are visible
  const subspeciesItems = await page.locator('.subspecies-item').all();
  console.log(`=== Found ${subspeciesItems.length} subspecies items ===\n`);

  let visibleCount = 0;
  for (const item of subspeciesItems) {
    if (await item.isVisible()) {
      visibleCount++;
    }
  }
  console.log(`Visible subspecies items: ${visibleCount}/${subspeciesItems.length}\n`);

  // Take screenshot for manual inspection
  await page.screenshot({
    path: 'tests/screenshots/debug-filter-state.png',
    fullPage: true
  });
});
