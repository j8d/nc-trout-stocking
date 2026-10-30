import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const IMAGERY = '**/basemap.nationalmap.gov/**';
// A tiny synthetic tile keeps tests deterministic and off the USGS service.
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgaGgAAAMEAYFL09IQAAAAAElFTkSuQmCC', 'base64');
const fakeImagery = page => page.route(IMAGERY, route => route.fulfill({ contentType: 'image/png', body: TILE }));

async function open(page, path = './') {
  await page.goto(path);
  await expect(page.locator('#count')).toHaveText(/of 33 waters/);
}
const mapRadio = page => page.getByRole('radio', { name: 'Map', exact: true });
const satelliteRadio = page => page.getByRole('radio', { name: 'Satellite' });
const choose = (page, name) => page.locator('#basemap-form').getByText(name, { exact: true }).click();
const tileHosts = page => page.locator('.leaflet-tile-pane img').evaluateAll(images =>
  [...new Set(images.map(image => new URL(image.src).host))]);
const strokes = page => page.locator('.leaflet-overlay-pane path')
  .evaluateAll(paths => [...new Set(paths.map(path => path.getAttribute('stroke')))].sort());
const context = page => page.evaluate(() => ({
  url: location.href,
  paths: document.querySelectorAll('.leaflet-overlay-pane path').length,
  pins: document.querySelectorAll('.date-marker, .water-cluster').length,
  selectedName: document.querySelector('.map-water-label.is-selected:not([hidden])')?.textContent,
  rows: document.querySelectorAll('.water-button').length,
  detail: document.querySelector('#detail h3').textContent,
  query: document.querySelector('#query').value,
  // Leaflet's map pane transform encodes the current center/zoom position.
  view: document.querySelector('.leaflet-map-pane').style.transform,
  tiles: [...document.querySelectorAll('.leaflet-tile-pane img')].map(image => new URL(image.src).pathname.match(/\/(\d+)\//)?.[1]).filter(Boolean).sort().at(-1),
}));
async function axe(page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
}

test('Map is the default; imagery is never requested until Satellite is chosen', async ({ page }) => {
  const imagery = [];
  page.on('request', request => { if (request.url().includes('nationalmap.gov')) imagery.push(request.url()); });
  await fakeImagery(page);
  await open(page);
  await expect(mapRadio(page)).toBeChecked();
  await expect(page.locator('#basemap-note')).toBeHidden();
  expect(await tileHosts(page)).toEqual(['tile.openstreetmap.org']);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  expect(imagery).toEqual([]);
});

test('Map → Satellite → Map keeps filters, selection, share URL, view and every overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await fakeImagery(page);
  await open(page, './?county=Jackson&water=jackson-tuckasegee-river');
  await expect(page.locator('#detail h3')).toHaveText('Tuckasegee River');
  const before = await context(page);

  await choose(page, 'Satellite');
  await expect(satelliteRadio(page)).toBeChecked();
  await expect.poll(() => tileHosts(page)).toEqual(['basemap.nationalmap.gov']);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('USGS The National Map');
  await expect(page.locator('.leaflet-control-attribution')).not.toContainText('OpenStreetMap');
  await expect(page.locator('#basemap-note')).toContainText('not live and does not show public access');
  // Attribution width can change how many other names fit; the selected
  // name keeps first placement and the hint stays honest about the count.
  const satellite = await context(page);
  expect({ ...satellite, tiles: before.tiles }).toEqual(before);
  await expect(page.locator('#label-hint')).toHaveText(/^\d+ of \d+ names shown/);
  await expect(page.locator('.line-key')).toHaveCSS('background-color', 'rgb(156, 242, 216)');
  // The filtered selection uses the imagery selection token.
  expect(await strokes(page)).toEqual(['#ffb08f']);

  await choose(page, 'Map');
  await expect(mapRadio(page)).toBeChecked();
  await expect.poll(() => tileHosts(page)).toEqual(['tile.openstreetmap.org']);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  await expect(page.locator('#basemap-note')).toBeHidden();
  expect(await context(page)).toEqual(before);
  expect(await strokes(page)).toEqual(['#a53d20']);
  await expect(page.locator('.line-key')).toHaveCSS('background-color', 'rgb(25, 63, 56)');

  // Filters and selection keep working while imagery is shown.
  await choose(page, 'Satellite');
  await page.locator('#county').selectOption('');
  await expect(page.locator('.water-button')).toHaveCount(33);
  await page.getByRole('button', { name: /^Helton Creek/ }).click();
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  expect(new URL(page.url()).searchParams.get('water')).toBe('ashe-helton-creek');
  expect(new URL(page.url()).searchParams.has('basemap')).toBe(false);
  await expect(satelliteRadio(page)).toBeChecked();
  // Unselected sections and the selection stay distinct on imagery.
  expect(await strokes(page)).toEqual(['#9cf2d8', '#ffb08f']);
});

test('keyboard switches base map with arrows, one tab stop and a visible focus ring', async ({ page }) => {
  await fakeImagery(page);
  await open(page);
  await page.getByRole('heading', { name: 'Explore the waters' }).click();
  await page.keyboard.press('Tab');
  await expect(mapRadio(page)).toBeFocused();
  const outline = await page.locator('label[for="basemap-map"]').evaluate(label => getComputedStyle(label).outlineStyle);
  expect(outline).toBe('solid');
  await page.keyboard.press('ArrowRight');
  await expect(satelliteRadio(page)).toBeFocused();
  await expect(satelliteRadio(page)).toBeChecked();
  await expect.poll(() => tileHosts(page)).toEqual(['basemap.nationalmap.gov']);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Fit results' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('ArrowLeft');
  await expect(mapRadio(page)).toBeChecked();
  await expect.poll(() => tileHosts(page)).toEqual(['tile.openstreetmap.org']);
});

test('zooming past the imagery detail level is disclosed and never requests missing levels', async ({ page }) => {
  const levels = [];
  await page.route(IMAGERY, route => {
    levels.push(Number(new URL(route.request().url()).pathname.split('/tile/')[1].split('/')[0]));
    return route.fulfill({ contentType: 'image/png', body: TILE });
  });
  await open(page, './?water=ashe-helton-creek');
  await choose(page, 'Satellite');
  await expect(page.locator('#basemap-note')).not.toContainText('enlarged');
  const zoomIn = page.locator('.leaflet-control-zoom-in');
  for (let i = 0; i < 5; i++) await zoomIn.click();
  await expect(page.locator('#basemap-note')).toContainText('enlarged past its full detail');
  expect(Math.max(...levels)).toBe(16);
  await choose(page, 'Map');
  await expect(page.locator('#basemap-note')).toBeHidden();
});

test('slow imagery shows loading feedback that clears when tiles arrive', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(IMAGERY, async route => { await gate; await route.fulfill({ contentType: 'image/png', body: TILE }); });
  await open(page);
  await choose(page, 'Satellite');
  await expect(page.locator('#basemap-status')).toHaveText('Loading satellite imagery…');
  await expect(page.locator('#basemap-status')).toHaveAttribute('role', 'status');
  release();
  await expect(page.locator('#basemap-status')).toHaveText('');
  await expect(page.locator('#basemap-status')).toBeHidden();
});

test('imagery failure explains itself, keeps all waters and returns to Map', async ({ page }) => {
  await page.route(IMAGERY, route => route.abort());
  await open(page);
  await choose(page, 'Satellite');
  await expect(page.locator('#tile-warning')).toBeVisible();
  await expect(page.locator('#tile-warning')).toContainText('Some satellite imagery could not load');
  await expect(page.locator('.water-button')).toHaveCount(33);
  await expect(page.locator('.leaflet-overlay-pane path')).not.toHaveCount(0);
  await page.locator('.water-button').first().click();
  await expect(page.locator('#detail .stock-date')).toBeVisible();
  const selectedUrl = page.url();

  const back = page.getByRole('button', { name: 'Switch back to Map' });
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(mapRadio(page)).toBeChecked();
  await expect(mapRadio(page)).toBeFocused();
  await expect(page.locator('#tile-warning')).toBeHidden();
  await expect.poll(() => tileHosts(page)).toEqual(['tile.openstreetmap.org']);
  expect(page.url()).toBe(selectedUrl);
});

test('road-map failure keeps its own message without offering a pointless switch', async ({ page }) => {
  await page.route('**/tile.openstreetmap.org/**', route => route.abort());
  await open(page);
  await expect(page.locator('#tile-warning')).toContainText('Some basemap tiles could not load');
  await expect(page.getByRole('button', { name: 'Switch back to Map' })).toBeHidden();
});

for (const scheme of ['light', 'dark']) {
  test(`${scheme} theme and base map stay independent and pass automated checks`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await fakeImagery(page);
    await open(page, './?water=ashe-helton-creek');
    const filter = () => page.locator('.leaflet-tile-pane').evaluate(pane => getComputedStyle(pane).filter);
    expect(await filter()).toBe(scheme === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)' : 'none');
    await choose(page, 'Satellite');
    expect(await filter()).toBe('none'); // Imagery is never inverted.
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
    await axe(page);

    const other = scheme === 'dark' ? 'Light' : 'Dark';
    await page.locator('#theme-form').getByText(other, { exact: true }).click();
    await expect(satelliteRadio(page)).toBeChecked();
    expect(await strokes(page)).toEqual(['#9cf2d8', '#ffb08f']);
    await axe(page);
  });
}

for (const width of [320, 390]) {
  test(`mobile ${width}px switching keeps 44px targets, no overflow and the selection`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await fakeImagery(page);
    await open(page, './?water=ashe-helton-creek');
    for (const label of await page.locator('#basemap-form label').all()) {
      const box = await label.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await choose(page, 'Satellite');
    await expect(satelliteRadio(page)).toBeChecked();
    await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const form = await page.locator('#basemap-form').boundingBox();
    expect(form.x + form.width).toBeLessThanOrEqual(width);
  });
}
