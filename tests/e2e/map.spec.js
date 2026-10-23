import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page, path = './') {
  await page.goto(path);
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
}

async function expectAllMapWaters(page) {
  const count = await page.evaluate(() => [...document.querySelectorAll('.water-cluster strong')]
    .reduce((sum, element) => sum + Number(element.textContent), document.querySelectorAll('.date-marker').length));
  expect(count).toBe(33);
}

test('all 33 waters render as list items, date pins or clusters, and mapped sections with no JS errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('.water-button')).toHaveCount(33);
  await expectAllMapWaters(page);
  expect(await page.locator('.leaflet-overlay-pane path').count()).toBeGreaterThanOrEqual(33);
  await expect(page.getByRole('heading', { name: 'Trout stocking map' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('search, county, date combine and empty state resets complete schedule', async ({ page }) => {
  await open(page);
  await page.getByLabel('Search waters or counties').fill('Tuckasegee');
  await expect(page.locator('.water-button')).toHaveCount(2);
  await page.getByLabel('County', { exact: true }).selectOption('Swain');
  await expect(page.locator('.water-button')).toHaveCount(1);
  await expect(page.locator('.water-button')).toContainText('4');
  await page.getByLabel('Stocking date', { exact: true }).selectOption('2026-11-03');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('.date-marker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show all 33 waters' }).click();
  await expect(page.locator('.water-button')).toHaveCount(33);
  await expectAllMapWaters(page);
});

test('selecting a water reveals full date, section description and point caveat; deep link survives reload', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Helton Creek, Ashe County.*Show on map/ }).click();
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  await expect(page.locator('#detail')).toContainText('Monday, November 2, 2026');
  await expect(page.locator('#detail')).toContainText('Not an exact release point');
  expect(new URL(page.url()).searchParams.get('water')).toBeTruthy();
  await page.reload();
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  await expect(page.locator('.water-button[aria-pressed=true]')).toHaveCount(1);
});

test('map pins are keyboard-selectable and agree with list details', async ({ page }) => {
  await open(page);
  await page.getByLabel('Search waters or counties').fill('Helton Creek');
  const helton = page.locator('.date-marker[aria-label^="Helton Creek,"]');
  await helton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  await expect(page.locator('.water-button[aria-pressed=true]')).toContainText('Helton Creek');
});

test('keyboard journey from skip link through search and reset works', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to stocking schedule' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#waters')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.water-button').first()).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#detail h3')).not.toHaveText('Choose a water to see more');
  await page.getByLabel('Search waters or counties').focus();
  await page.keyboard.type('nonexistent');
  await expect(page.locator('#empty')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.water-button')).toHaveCount(33);
});

for (const width of [320, 768, 1024, 1440]) {
  test(`responsive layout at ${width}px has no page overflow and supports selection`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Search waters or counties').fill('Helton Creek');
    await page.locator('.water-button').click();
    await expect(page.locator('#detail h3')).toBeVisible();
    await page.screenshot({ path: `test-results/map-${width}.png`, fullPage: true });
  });
}

test('WCAG A/AA automated accessibility checks pass on initial and selected states', async ({ page }) => {
  await open(page);
  for (const selected of [false, true]) {
    if (selected) await page.locator('.water-button').first().click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('blocked basemap leaves full local schedule, sections and explicit warning', async ({ page }) => {
  await page.route('**/tile.openstreetmap.org/**', route => route.abort());
  await open(page);
  await expect(page.locator('#tile-warning')).toBeVisible();
  await expect(page.locator('.water-button')).toHaveCount(33);
  await expectAllMapWaters(page);
  await page.locator('.water-button').first().click();
  await expect(page.locator('#detail .stock-date')).toBeVisible();
});

test('missing local data displays an honest error and official fallback', async ({ page }) => {
  await page.route('**/data/waters.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('./');
  await expect(page.locator('#load-error')).toBeVisible();
  await expect(page.locator('#count')).toHaveText('Data unavailable');
  await expect(page.locator('#load-error a')).toHaveAttribute('href', 'https://www.ncwildlife.gov/delayed-harvest-schedule');
});

test('invalid URL filters are normalized without hiding all waters', async ({ page }) => {
  await open(page, './?county=NotACounty&date=1999-01-01&water=missing');
  await expect(page.getByLabel('County', { exact: true })).toHaveValue('');
  await expect(page.locator('.water-button')).toHaveCount(33);
});
