import { test } from '@playwright/test';

test('Debug CSS rules for accordion-content', async ({ page }) => {
  await page.goto('http://localhost:4321/species/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(3000);

  // Get the first subspecies accordion
  const accordion = page.locator('#subspecies-willinckii').first();

  // Get all CSS rules applied to this element
  const cssDebug = await accordion.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    const classList = Array.from(el.classList);

    return {
      classList,
      computedOverflow: computed.overflow,
      computedMaxHeight: computed.maxHeight,
      computedTransition: computed.transition,
      inlineStyle: el.getAttribute('style'),
      // Try to find which stylesheet the rule comes from
      hasAccordionContentClass: el.classList.contains('accordion-content')
    };
  });

  console.log('\n=== CSS Debug Info for #subspecies-willinckii ===');
  console.log(JSON.stringify(cssDebug, null, 2));

  // Check if the style tag is present
  const styleContent = await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll('style'));
    const relevantStyles = styles.map(style => {
      const text = style.textContent || '';
      if (text.includes('accordion-content')) {
        return text.substring(text.indexOf('.accordion-content'), text.indexOf('.accordion-content') + 200);
      }
      return null;
    }).filter(Boolean);
    return relevantStyles;
  });

  console.log('\n=== Style rules containing .accordion-content ===');
  console.log(styleContent);
});
