import { test, expect } from '@playwright/test';

test('every scheduled water selects its own official date and section', async ({ page, request }) => {
  const response = await request.get('data/waters.json');
  expect(response.ok()).toBe(true);
  const waters = await response.json();
  expect(waters).toHaveLength(33);
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  for (const water of waters) {
    await page.locator(`.water-button[data-id="${water.id}"]`).click();
    await expect(page.locator('#detail h3')).toHaveText(water.name);
    await expect(page.locator('#detail .section-description')).toHaveText(water.section);
    const day = Number(water.date.slice(-2));
    await expect(page.locator('#detail .stock-date')).toContainText(`November ${day}, 2026`);
    await expect(page.locator('.date-marker.selected')).toHaveText(String(day));
    await expect(page.locator(`.map-water-label[data-water-id="${water.id}"]`)).toBeVisible();
    expect(new URL(page.url()).searchParams.get('water')).toBe(water.id);
    if (water.scopeNote) await expect(page.locator('#detail')).toContainText(water.scopeNote);
  }
});

test('nearby-water clusters expand by keyboard and markers support Space', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  const cluster = page.locator('.water-cluster').first();
  await expect(cluster).toBeVisible();
  const tileZoom = () => page.locator('.leaflet-tile-pane img').evaluateAll(images => Math.max(...images.map(image => Number(new URL(image.src).pathname.split('/')[1]))));
  const before = await tileZoom();
  await cluster.focus();
  await page.keyboard.press('Enter');
  await expect.poll(tileZoom).toBeGreaterThan(before);
  await page.getByLabel('Search waters or counties').fill('Helton Creek');
  const marker = page.locator('.date-marker');
  await marker.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#detail h3')).toHaveText('Helton Creek');
  await expect(marker).toBeFocused();
});
