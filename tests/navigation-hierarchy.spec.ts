import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('complete 3-level navigation hierarchy', async ({ page }) => {
  // Console errors collection
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('\n=== LEVEL 1: Main Species Page ===');

  // Navigate to main species page
  await page.goto('http://localhost:4321/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for page to be fully loaded
  await page.waitForTimeout(2000);

  // Take Level 1 screenshot
  await page.screenshot({
    path: path.join(screenshotsDir, 'hierarchy-level1.png'),
    fullPage: true
  });

  // Verify Level 1 URL
  const level1Url = page.url();
  console.log('Level 1 URL:', level1Url);
  expect(level1Url).toContain('/species/');
  expect(level1Url).not.toContain('.html');

  // Wait for loading to complete
  await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 }).catch(() => {
    console.log('Loading spinner not found or already hidden');
  });

  // Count species cards at Level 1
  const level1Cards = await page.locator('.species-card, .hybrid-group-card').count();
  console.log(`Level 1 Cards: ${level1Cards}`);
  expect(level1Cards).toBeGreaterThan(0);

  // Find a species card with subspecies (looking for willinckii or ウィリンキー)
  console.log('\nSearching for species with subspecies...');

  // Try to find willinckii card
  let targetCard = page.locator('.species-card, .hybrid-group-card').filter({
    hasText: /willinckii|ウィリンキー/i
  }).first();

  const cardCount = await targetCard.count();
  if (cardCount === 0) {
    console.log('willinckii not found, trying any card with subspecies indicator...');
    // Look for any card that might have subspecies
    targetCard = page.locator('.species-card, .hybrid-group-card').first();
  }

  // Get the card text for logging
  const cardText = await targetCard.textContent();
  console.log(`Clicking on card: ${cardText?.substring(0, 50)}...`);

  // Click the card
  await targetCard.click();

  console.log('\n=== LEVEL 2: Subspecies Page ===');

  // Wait for navigation
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take Level 2 screenshot
  await page.screenshot({
    path: path.join(screenshotsDir, 'hierarchy-level2.png'),
    fullPage: true
  });

  // Verify Level 2 URL
  const level2Url = page.url();
  console.log('Level 2 URL:', level2Url);
  expect(level2Url).toContain('/species/subspecies');
  expect(level2Url).toContain('parent=');
  expect(level2Url).not.toContain('.html');

  // Extract parent parameter
  const urlParams = new URL(level2Url).searchParams;
  const parentSpecies = urlParams.get('parent');
  console.log(`Parent species: ${parentSpecies}`);

  // Wait for loading to complete
  await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 }).catch(() => {
    console.log('Loading spinner not found or already hidden');
  });

  // Count subspecies cards at Level 2
  let level2Cards = await page.locator('.subspecies-card').count();

  console.log(`Level 2 Cards (subspecies): ${level2Cards}`);

  // Check page title or heading
  const pageHeading = await page.locator('h2').first().textContent();
  console.log(`Level 2 Heading: ${pageHeading}`);

  // Check for subspecies section visibility
  const subspeciesSection = await page.locator('#subspecies-section');
  const isSectionVisible = await subspeciesSection.isVisible().catch(() => false);
  console.log(`Subspecies section visible: ${isSectionVisible}`);

  // Click on the first subspecies card if available
  if (level2Cards > 0) {
    const clickableElement = page.locator('.subspecies-card').first();
    const elementText = await clickableElement.textContent();
    console.log(`\nClicking on element: ${elementText?.substring(0, 50)}...`);

    await clickableElement.click();

    console.log('\n=== LEVEL 3: Detail Page ===');

    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take Level 3 screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'hierarchy-level3.png'),
      fullPage: true
    });

    // Verify Level 3 URL
    const level3Url = page.url();
    console.log('Level 3 URL:', level3Url);
    expect(level3Url).toContain('/species/detail');
    expect(level3Url).toContain('id=');
    expect(level3Url).not.toContain('.html');

    // Extract id parameter
    const level3Params = new URL(level3Url).searchParams;
    const detailId = level3Params.get('id');
    console.log(`Detail ID: ${detailId}`);

    // Wait for loading to complete
    await page.waitForSelector('#loading', { state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('Loading spinner not found or already hidden');
    });

    // Count post cards at Level 3
    const postCards = await page.locator('.post-card, .species-card').count();
    console.log(`Level 3 Cards (posts): ${postCards}`);

    // Check for detail page heading
    const detailHeading = await page.locator('h1, h2').first().textContent();
    console.log(`Level 3 Heading: ${detailHeading}`);

    // Check if content is loaded
    const hasContent = await page.locator('main, .content, article').count();
    console.log(`Content sections found: ${hasContent}`);

    console.log('\n=== Navigation Test Summary ===');
    console.log('✓ Level 1 (Species): Loaded successfully');
    console.log(`  - URL: ${level1Url}`);
    console.log(`  - Cards: ${level1Cards}`);
    console.log('✓ Level 2 (Subspecies): Loaded successfully');
    console.log(`  - URL: ${level2Url}`);
    console.log(`  - Parent: ${parentSpecies}`);
    console.log(`  - Cards: ${level2Cards}`);
    console.log('✓ Level 3 (Detail): Loaded successfully');
    console.log(`  - URL: ${level3Url}`);
    console.log(`  - ID: ${detailId}`);
    console.log(`  - Posts: ${postCards}`);
    console.log(`\nTotal Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
    console.log('\nAll screenshots saved to:', screenshotsDir);
  } else {
    console.log('\n=== Navigation Test Summary (Partial) ===');
    console.log('✓ Level 1 (Species): Loaded successfully');
    console.log(`  - URL: ${level1Url}`);
    console.log(`  - Cards: ${level1Cards}`);
    console.log('✓ Level 2 (Subspecies): Loaded successfully');
    console.log(`  - URL: ${level2Url}`);
    console.log(`  - Parent: ${parentSpecies}`);
    console.log(`  - Cards: ${level2Cards}`);
    console.log('⚠ Level 3 (Detail): Skipped (no subspecies available)');
    console.log(`\nTotal Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
    console.log('\nScreenshots saved to:', screenshotsDir);
  }
});
