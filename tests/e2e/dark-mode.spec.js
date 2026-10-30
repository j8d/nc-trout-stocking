import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LIGHT = { paper: 'rgb(246, 244, 238)', pine: 'rgb(25, 63, 56)', rust: 'rgb(165, 61, 32)' };
const DARK = { paper: 'rgb(18, 28, 26)', section: 'rgb(134, 220, 195)', selected: 'rgb(255, 158, 120)', rust: 'rgb(242, 145, 112)' };
const hex = { '#193f38': LIGHT.pine, '#a53d20': LIGHT.rust, '#86dcc3': DARK.section, '#ff9e78': DARK.selected };

async function open(page, path = './') {
  await page.goto(path);
  await expect(page.locator('#count')).toHaveText(/of 33 waters/);
}
const theme = page => page.locator('html').getAttribute('data-theme');
const background = page => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
const sectionStrokes = page => page.locator('.leaflet-overlay-pane path')
  .evaluateAll(paths => [...new Set(paths.map(path => path.getAttribute('stroke')))]);
async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
}

test('follows the system preference, including live changes, until a choice is made', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  expect(await theme(page)).toBe('dark');
  await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
  expect(await background(page)).toBe(DARK.paper);
  expect((await sectionStrokes(page)).map(color => hex[color])).toEqual([DARK.section]);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#121c1a');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => theme(page)).toBe('light');
  expect(await background(page)).toBe(LIGHT.paper);
  expect((await sectionStrokes(page)).map(color => hex[color])).toEqual([LIGHT.pine]);
});

test('explicit choice beats the system, survives reload, and System clears it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  await page.getByText('Dark', { exact: true }).click();
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('nc-trout-theme'))).toBe('dark');
  await page.reload();
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  expect(await theme(page)).toBe('dark');
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();

  // An explicit Light choice also beats a dark system.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByText('Light', { exact: true }).click();
  expect(await theme(page)).toBe('light');
  await page.reload();
  expect(await theme(page)).toBe('light');

  await page.getByText('System', { exact: true }).click();
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('nc-trout-theme'))).toBeNull();
});

test('blocked storage falls back to the system theme and still switches for the visit', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Storage disabled', 'SecurityError'); },
  }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  expect(await theme(page)).toBe('dark');
  await page.getByText('Light', { exact: true }).click();
  expect(await theme(page)).toBe('light');
  await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();
  await page.reload();
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  expect(await theme(page)).toBe('dark');
  expect(errors).toEqual([]);
});

test('keyboard journey: choose Dark, filter, select and share a water', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // home link
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'System' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeFocused();
  expect(await theme(page)).toBe('dark');
  const outline = await page.locator('label[for="theme-dark"]').evaluate(label => {
    const style = getComputedStyle(label);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
  });
  expect(outline).toBe(`solid 3px ${DARK.rust}`);

  await page.keyboard.press('Tab'); // official schedule link
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Search waters or counties')).toBeFocused();
  await page.keyboard.type('Helton Creek');
  await expect(page.locator('.water-button')).toHaveCount(1);
  await page.locator('.water-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  await expect(page.locator('.water-button')).toBeFocused();
  expect((await sectionStrokes(page)).map(color => hex[color])).toEqual([DARK.selected]);
  const url = new URL(page.url());
  expect(url.searchParams.get('query')).toBe('Helton Creek');
  expect(url.searchParams.get('water')).toBe('ashe-helton-creek');

  await page.goto(url.toString());
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  expect(await theme(page)).toBe('dark');
  await axe(page);
});

test('dark map keeps OSM tiles, attribution, labels and themed controls; light map is unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, './?water=ashe-helton-creek');
  const map = await page.evaluate(() => {
    const zoom = document.querySelector('.leaflet-control-zoom-in');
    return {
      tiles: [...document.querySelectorAll('.leaflet-tile')].every(tile => tile.src.startsWith('https://tile.openstreetmap.org/')),
      filter: getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter,
      zoom: getComputedStyle(zoom).backgroundColor,
      label: getComputedStyle(document.querySelector('.map-water-label')).backgroundColor,
    };
  });
  expect(map.tiles).toBe(true);
  expect(map.filter).toContain('invert(1)');
  expect(map.zoom).toBe('rgb(24, 37, 35)');
  expect(map.label).toBe('rgb(24, 37, 35)');
  await expect(page.locator('.leaflet-control-attribution')).toBeVisible();
  await expect(page.locator('.leaflet-control-attribution a[href*="openstreetmap.org/copyright"]')).toBeVisible();
  await expect(page.locator('.map-water-label.is-selected')).toHaveText('Helton Creek');
  await axe(page);

  await page.getByText('Light', { exact: true }).click();
  expect(await page.locator('.leaflet-tile-pane').evaluate(pane => getComputedStyle(pane).filter)).toBe('none');
  expect(await page.locator('.leaflet-control-zoom-in').evaluate(zoom => getComputedStyle(zoom).backgroundColor)).toBe('rgb(255, 255, 255)');
  const strokes = await sectionStrokes(page);
  expect(strokes.map(color => hex[color]).sort()).toEqual([LIGHT.rust, LIGHT.pine].sort());
});

for (const width of [320, 390]) {
  test(`dark mobile journey at ${width}px keeps layout, targets and selection`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of await page.locator('.theme-options label').all()) {
      const box = await label.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByLabel('Search waters or counties').fill('Helton Creek');
    await page.locator('.water-button').click();
    await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
    await expect(page.locator('#detail')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await axe(page);
  });
}

test('dark error states stay explicit and accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.route('**/tile.openstreetmap.org/**', route => route.abort());
  await open(page);
  await expect(page.locator('#tile-warning')).toBeVisible();
  await axe(page);

  await page.route('**/data/waters.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.reload();
  await expect(page.locator('#load-error')).toBeVisible();
  expect(await theme(page)).toBe('dark');
  await axe(page);
});
