import { test, expect } from '@playwright/test';

test('Fit results includes the entire long river section on a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  await page.getByLabel('Search waters or counties').fill('Helton Creek');
  await page.getByRole('button', { name: 'Fit results' }).click();
  const fits = await page.evaluate(() => {
    const map = document.querySelector('#map').getBoundingClientRect();
    return [...document.querySelectorAll('.leaflet-overlay-pane path')].every(path => {
      const bounds = path.getBoundingClientRect();
      return bounds.left >= map.left + 8 && bounds.right <= map.right - 8
        && bounds.top >= map.top + 8 && bounds.bottom <= map.bottom - 8;
    });
  });
  expect(fits).toBe(true);
});

test('keyboard empty-state reset restores focus to a visible search control', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  await page.getByLabel('Search waters or counties').fill('no-such-water');
  const reset = page.getByRole('button', { name: 'Show all 33 waters' });
  await reset.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.water-button')).toHaveCount(33);
  await expect(page.getByLabel('Search waters or counties')).toBeFocused();
});

test('history state validates filters just like initial deep links', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  await page.evaluate(() => {
    history.pushState(null, '', '?county=NotACounty&date=1999-01-01&water=missing');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByLabel('County', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Stocking date', { exact: true })).toHaveValue('');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  expect(new URL(page.url()).search).toBe('');
});
