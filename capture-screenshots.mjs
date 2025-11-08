import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the species page
    await page.goto('http://localhost:4321/species/', { waitUntil: 'networkidle' });

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // 1. Full page screenshot
    await page.screenshot({
      path: join(__dirname, 'species-layout-issues-full.png'),
      fullPage: true
    });
    console.log('✓ Captured full page screenshot');

    // 2. Close-up of filter section
    const filterSection = await page.locator('.filter-section, aside, [class*="filter"]').first();
    if (await filterSection.count() > 0) {
      await filterSection.screenshot({
        path: join(__dirname, 'species-layout-issues-filter.png')
      });
      console.log('✓ Captured filter section screenshot');
    } else {
      console.log('⚠ Filter section not found, trying alternative selector');
      // Try to capture left sidebar
      await page.screenshot({
        path: join(__dirname, 'species-layout-issues-filter.png'),
        clip: { x: 0, y: 100, width: 400, height: 800 }
      });
    }

    // 3. Close-up of species cards grid
    const cardsGrid = await page.locator('.species-grid, .grid, [class*="card"]').first();
    if (await cardsGrid.count() > 0) {
      await cardsGrid.screenshot({
        path: join(__dirname, 'species-layout-issues-cards.png')
      });
      console.log('✓ Captured species cards screenshot');
    } else {
      console.log('⚠ Cards grid not found, trying alternative approach');
      // Try to capture right section
      await page.screenshot({
        path: join(__dirname, 'species-layout-issues-cards.png'),
        clip: { x: 400, y: 100, width: 1520, height: 800 }
      });
    }

    console.log('\n✓ All screenshots captured successfully!');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
