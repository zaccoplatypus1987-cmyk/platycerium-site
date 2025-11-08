import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Detailed Visual and Functional Comparison', async ({ page }) => {
  const screenshotDir = path.join(__dirname, '../test-results/gallery-screenshots');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    comparison: {
      structure: {},
      styling: {},
      functionality: {},
      differences: []
    }
  };

  // Test Original HTML
  await test.step('Analyze Original HTML', async () => {
    await page.goto('http://localhost:8000/gallery.html');
    await page.waitForLoadState('networkidle');

    const original = {
      title: await page.title(),
      headerBg: await page.locator('header').evaluate(el => window.getComputedStyle(el).backgroundColor),
      headerClass: await page.locator('header').getAttribute('class'),
      asideVisible: await page.locator('aside').isVisible(),
      asideBg: await page.locator('aside > div').evaluate(el => window.getComputedStyle(el).backgroundColor),
      postCards: await page.locator('a[href*="detail.html"]').count(),
      filterButtons: await page.locator('.filter-btn').count(),
      clearButton: await page.locator('#clear-filters').isVisible(),
      galleryStats: await page.locator('#gallery-stats').textContent(),
      footerBg: await page.locator('footer').evaluate(el => window.getComputedStyle(el).backgroundColor),
      hasSearchBar: await page.locator('#search-input').isVisible(),
      hasMobileMenu: await page.locator('#mobile-menu-btn').isVisible(),
    };

    report.comparison.structure.original = original;
    console.log('\n=== ORIGINAL HTML DETAILS ===');
    console.log(JSON.stringify(original, null, 2));
  });

  // Test Astro version
  await test.step('Analyze Astro Version', async () => {
    await page.goto('http://localhost:4321/gallery');
    await page.waitForLoadState('networkidle');

    const astro = {
      title: await page.title(),
      headerBg: await page.locator('header').first().evaluate(el => window.getComputedStyle(el).backgroundColor),
      headerClass: await page.locator('header').first().getAttribute('class'),
      asideVisible: await page.locator('aside').isVisible(),
      asideBg: await page.locator('aside > div').evaluate(el => window.getComputedStyle(el).backgroundColor),
      postCards: await page.locator('a[href*="detail.html"]').count(),
      filterButtons: await page.locator('.filter-btn').count(),
      clearButton: await page.locator('#clear-filters').isVisible(),
      galleryStats: await page.locator('#gallery-stats').textContent(),
      footerBg: await page.locator('footer').first().evaluate(el => window.getComputedStyle(el).backgroundColor),
      hasSearchBar: await page.locator('#search-input').isVisible(),
      hasMobileMenu: await page.locator('#mobile-menu-btn').isVisible(),
    };

    report.comparison.structure.astro = astro;
    console.log('\n=== ASTRO VERSION DETAILS ===');
    console.log(JSON.stringify(astro, null, 2));
  });

  // Compare and identify differences
  await test.step('Identify Differences', async () => {
    const orig = report.comparison.structure.original;
    const ast = report.comparison.structure.astro;

    console.log('\n=== KEY DIFFERENCES ===');

    if (orig.title !== ast.title) {
      const diff = {
        property: 'Page Title',
        original: orig.title,
        astro: ast.title,
        severity: 'minor'
      };
      report.comparison.differences.push(diff);
      console.log(`\n[MINOR] Page Title:`);
      console.log(`  Original: ${orig.title}`);
      console.log(`  Astro:    ${ast.title}`);
    }

    if (orig.headerBg !== ast.headerBg) {
      const diff = {
        property: 'Header Background Color',
        original: orig.headerBg,
        astro: ast.headerBg,
        severity: 'major'
      };
      report.comparison.differences.push(diff);
      console.log(`\n[MAJOR] Header Background Color:`);
      console.log(`  Original: ${orig.headerBg}`);
      console.log(`  Astro:    ${ast.headerBg}`);
    }

    if (orig.footerBg !== ast.footerBg) {
      const diff = {
        property: 'Footer Background Color',
        original: orig.footerBg,
        astro: ast.footerBg,
        severity: 'major'
      };
      report.comparison.differences.push(diff);
      console.log(`\n[MAJOR] Footer Background Color:`);
      console.log(`  Original: ${orig.footerBg}`);
      console.log(`  Astro:    ${ast.footerBg}`);
    }

    if (orig.postCards === ast.postCards) {
      console.log(`\n[PASS] Post Cards Count: ${orig.postCards} (identical)`);
    } else {
      const diff = {
        property: 'Post Cards Count',
        original: orig.postCards,
        astro: ast.postCards,
        severity: 'critical'
      };
      report.comparison.differences.push(diff);
      console.log(`\n[CRITICAL] Post Cards Count:`);
      console.log(`  Original: ${orig.postCards}`);
      console.log(`  Astro:    ${ast.postCards}`);
    }

    if (orig.filterButtons === ast.filterButtons) {
      console.log(`[PASS] Filter Buttons Count: ${orig.filterButtons} (identical)`);
    } else {
      const diff = {
        property: 'Filter Buttons Count',
        original: orig.filterButtons,
        astro: ast.filterButtons,
        severity: 'critical'
      };
      report.comparison.differences.push(diff);
      console.log(`\n[CRITICAL] Filter Buttons Count:`);
      console.log(`  Original: ${orig.filterButtons}`);
      console.log(`  Astro:    ${ast.filterButtons}`);
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total differences found: ${report.comparison.differences.length}`);
    console.log(`Critical: ${report.comparison.differences.filter(d => d.severity === 'critical').length}`);
    console.log(`Major: ${report.comparison.differences.filter(d => d.severity === 'major').length}`);
    console.log(`Minor: ${report.comparison.differences.filter(d => d.severity === 'minor').length}`);
  });

  // Save detailed report
  fs.writeFileSync(
    path.join(screenshotDir, 'detailed-comparison-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nDetailed report saved to: ${path.join(screenshotDir, 'detailed-comparison-report.json')}`);
});
