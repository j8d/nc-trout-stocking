import { test, expect } from '@playwright/test';

async function open(page, path = './') {
  await page.goto(path);
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
}

async function labelLayout(page) {
  return page.locator('.map-water-label').evaluateAll(labels => {
    const map = document.querySelector('#map').getBoundingClientRect();
    const boxes = labels.filter(label => !label.hidden).map(label => {
      const rect = label.getBoundingClientRect();
      return { text: label.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    });
    return {
      names: boxes.map(box => box.text),
      outside: boxes.filter(box => box.left < map.left || box.right > map.right || box.top < map.top || box.bottom > map.bottom),
      coveredPins: boxes.flatMap(box => [...document.querySelectorAll('.date-marker, .water-cluster')].filter(pin => {
        const rect = pin.getBoundingClientRect();
        return box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top;
      }).map(pin => [box.text, pin.textContent])),
      collisions: boxes.flatMap((box, index) => boxes.slice(index + 1).filter(other =>
        box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
      ).map(other => [box.text, other.text])),
    };
  });
}

for (const target of ['svg', 'h1']) {
  test(`whole brand ${target} links home and clears deep link and filters`, async ({ page }) => {
    await page.goto('./?query=Tuckasegee&county=Swain&date=2026-11-04&water=swain-tuckasegee-river#detail');
    await expect(page.locator('#count')).toHaveText('1 of 33 waters');
    await expect(page.locator('#detail h3')).toHaveText('Tuckasegee River');
    await expect(page.locator('#query')).toHaveValue('Tuckasegee');
    const home = page.getByRole('link', { name: 'Trout stocking map — home' });
    await expect(home).toHaveAttribute('href', '/nc-trout-stocking/');
    await home.locator(target).click();
    await expect(page).toHaveURL(/\/nc-trout-stocking\/$/);
    await expect(page.locator('#count')).toHaveText('33 of 33 waters');
    await expect(page.locator('#query')).toHaveValue('');
    await expect(page.locator('#county')).toHaveValue('');
    await expect(page.locator('#date')).toHaveValue('');
    await expect(page.locator('#detail h3')).toHaveText('Choose a water to see more');
  });
}

test('home link can be activated with a keyboard and legend uses a generic day', async ({ page }) => {
  await open(page);
  const home = page.getByRole('link', { name: 'Trout stocking map — home' });
  await home.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/nc-trout-stocking\/$/);
  await expect(page.locator('.pin-key')).toHaveText('#');
});

for (const width of [320, 768, 1440]) {
  test(`permanent independent names are readable in overview and clustered results at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await expect(page.locator('.water-cluster').first()).toBeVisible();
    await expect.poll(async () => (await labelLayout(page)).names.length).toBeGreaterThan(5);
    const overview = await labelLayout(page);
    expect(overview.collisions).toEqual([]);
    expect(overview.outside).toEqual([]);
    expect(overview.coveredPins).toEqual([]);
    await page.screenshot({ path: `test-results/names-page-overview-${width}.png`, fullPage: true });
    await page.locator('#map').screenshot({ path: `test-results/names-overview-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.locator('#query').fill('Tuckasegee');
    await expect(page.locator('#count')).toHaveText('2 of 33 waters');
    await expect(page.locator('.map-water-label').filter({ hasText: 'Tuckasegee River · Jackson County' })).toBeVisible();
    await expect(page.locator('.map-water-label').filter({ hasText: 'Tuckasegee River · Swain County' })).toBeVisible();
    expect((await labelLayout(page)).collisions).toEqual([]);
    await page.locator('#map').screenshot({ path: `test-results/names-tuckasegee-${width}.png` });

    await page.locator('#query').fill('');
    await page.locator('#county').selectOption('Madison');
    await expect(page.locator('.water-cluster').first()).toBeVisible();
    await expect(page.locator('#count')).toHaveText('3 of 33 waters');
    await expect.poll(async () => (await labelLayout(page)).names.length).toBe(3);
    expect((await labelLayout(page)).collisions).toEqual([]);
    expect((await labelLayout(page)).coveredPins).toEqual([]);
    await page.locator('#map').screenshot({ path: `test-results/names-nearby-${width}.png` });

    await page.locator('#query').fill('no-such-water');
    await expect(page.locator('#count')).toHaveText('0 of 33 waters');
    await expect(page.locator('.map-water-label')).toHaveCount(0);
  });
}

test('names relayout after zoom, map pan, viewport resize and reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect.poll(async () => (await labelLayout(page)).names.length).toBeGreaterThan(5);
  await page.locator('#map').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.map-water-names')).toBeVisible();
  const map = await page.locator('#map').boundingBox();
  await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2);
  await page.mouse.down();
  await page.mouse.move(map.x + map.width / 2 + 55, map.y + map.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.map-water-names')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.getByRole('button', { name: 'Fit results', exact: true }).click();
  await expect.poll(async () => (await labelLayout(page)).names.length).toBeGreaterThan(5);
  const layout = await labelLayout(page);
  expect(layout.outside).toEqual([]);
  expect(layout.collisions).toEqual([]);
  expect(layout.coveredPins).toEqual([]);
  await page.locator('#query').fill('Helton Creek');
  await expect(page.locator('.map-water-label')).toHaveText('Helton Creek');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
  await expect.poll(async () => (await labelLayout(page)).names.length).toBeGreaterThan(5);
});

test('water label source text is not parsed as HTML', async ({ page }) => {
  await page.route('**/data/waters.json', async route => {
    const response = await route.fetch();
    const waters = await response.json();
    waters[0].name = '<img src=x onerror="window.labelInjected=true">';
    await route.fulfill({ response, json: waters });
  });
  await open(page);
  await page.locator('#query').fill('<img');
  await expect(page.locator('.map-water-label')).toHaveText('<img src=x onerror="window.labelInjected=true">');
  expect(await page.locator('.map-water-label img').count()).toBe(0);
  expect(await page.evaluate(() => window.labelInjected)).toBeUndefined();
});
