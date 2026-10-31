import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CREDIT = 'Website by Ryan Stutzman · © 2026 Ryan Stutzman.';

async function open(page) {
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
}

test('footer credits Ryan for the website only and keeps every source credit', async ({ page }) => {
  await open(page);
  const footer = page.locator('footer');
  await expect(footer).toContainText(CREDIT);
  await expect(footer).toContainText('An independent guide, not an official NC Wildlife website.');
  await expect(footer).toContainText('map data, imagery and NC Wildlife content remain with their credited sources');
  await expect(footer).not.toContainText(/all rights reserved/i);
  await expect(footer.getByRole('link', { name: 'MIT licensed' }))
    .toHaveAttribute('href', 'https://github.com/j8d/nc-trout-stocking/blob/main/LICENSE');
  for (const name of ['Download data', 'Sources & method', 'GitHub ↗']) {
    await expect(footer.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.locator('.data-credit')).toContainText('source of the North Carolina Wildlife Resources Commission');
  await expect(page.locator('.leaflet-control-attribution a[href*="openstreetmap.org/copyright"]')).toBeVisible();

  await page.getByText('Satellite', { exact: true }).click();
  await expect(page.locator('.leaflet-control-attribution')).toContainText('USGS The National Map');
  await expect(footer).toContainText(CREDIT);
});

test('footer links are keyboard reachable in order', async ({ page }) => {
  await open(page);
  await page.locator('footer').getByRole('link', { name: 'MIT licensed' }).focus();
  await expect(page.locator('footer').getByRole('link', { name: 'MIT licensed' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('footer').getByRole('link', { name: 'Download data' })).toBeFocused();
});

for (const theme of ['light', 'dark']) {
  test(`footer wraps at 320px and passes axe in ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => {
      const box = document.querySelector('footer').getBoundingClientRect();
      return document.documentElement.scrollWidth > innerWidth || box.right > innerWidth;
    });
    expect(overflow).toBe(false);
    const results = await new AxeBuilder({ page }).include('footer')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}
