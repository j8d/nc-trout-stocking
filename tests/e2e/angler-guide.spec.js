import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const waters = JSON.parse(readFileSync(new URL('../../public/data/waters.json', import.meta.url)));
const plain = text => text; // Superscript links retain the approved numbered markers.
async function open(page) {
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
}

test('all 33 listings disclose their own approved guide, designation, date and safe sources', async ({ page, request }) => {
  test.setTimeout(90000); // All 33 disclosures and source sets, not a single interaction.
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('#water-list details')).toHaveCount(33);
  const guide = await (await request.get('data/angler-guide.json')).json();
  for (const water of waters) {
    const entry = guide.entries.find(e => e.id === water.id);
    const row = page.locator(`#water-list li[data-water-id="${water.id}"]`);
    const disclosure = row.locator('details');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await disclosure.locator('summary').click();
    await expect(row.locator('.angler-summary')).toHaveText(plain(entry.summary));
    await expect(row.locator('.planning-note')).toHaveText('Trip-planning note: ' + plain(entry.planningNote));
    await expect(row.locator('.section-description')).toHaveText(water.section);
    await expect(row).toContainText('Delayed harvest');
    await expect(row.locator('time[datetime="2026-10-23"]')).toHaveText('October 23, 2026');
    await expect(row.locator('.guide-date time')).toHaveAttribute('datetime', water.date);
    await expect(row.locator('.source-list a')).toHaveCount(entry.sourceIds.length);
    for (const id of entry.sourceIds) {
      const source = guide.sources.find(s => s.id === id);
      await expect(row.locator(`.source-list a[data-source-id="${id}"]`)).toHaveAttribute('href', source.url);
    }
    const expectedCitations = [...(entry.summary + entry.planningNote).matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
    expect(await row.locator('.citation').evaluateAll(links => links.map(a => Number(a.dataset.sourceId)))).toEqual(expectedCitations);
    const safe = await row.locator('.angler-guide a').evaluateAll(links => links.every(a => a.protocol === 'https:' && a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer') && a.getAttribute('aria-label')));
    expect(safe).toBe(true);
    expect(await row.locator('button a, button details, summary a, summary button').count()).toBe(0);
    await disclosure.locator('summary').click();
  }
  expect(await page.locator('#water-list').textContent()).not.toMatch(/Editorial verification|proofread|citationEvidence|evidenceNotes|review draft|\/home\//i);
  expect(errors).toEqual([]);
});

test('list and map selection expose the same guide, preserve disclosure and delayed keyboard focus', async ({ page, request }) => {
  await open(page);
  const guide = await (await request.get('data/angler-guide.json')).json();
  for (const water of waters.filter(w => ['jackson-tuckasegee-river', 'swain-tuckasegee-river', 'watauga-watauga-river', 'wilkes-elk-creek'].includes(w.id))) {
    await page.locator('#query').fill(water.name);
    await page.locator('#county').selectOption(water.county);
    const row = page.locator(`#water-list li[data-water-id="${water.id}"]`);
    const summary = row.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(summary).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(row.locator('.citation').first()).toBeFocused();
    const button = row.locator('.water-button');
    await button.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(700); // Covers Leaflet's delayed focus/cluster cleanup.
    await expect(button).toBeFocused();
    await expect(row.locator('details')).toHaveAttribute('open', '');
    const entry = guide.entries.find(e => e.id === water.id);
    await expect(page.locator('#detail .angler-summary')).toHaveText(plain(entry.summary));
    await expect(page.locator('#detail .planning-note')).toHaveText('Trip-planning note: ' + plain(entry.planningNote));
    const marker = page.locator('.date-marker.selected');
    await marker.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    await expect(page.locator('.date-marker.selected')).toBeFocused();
    await expect(page.locator('#detail .angler-summary')).toHaveText(plain(entry.summary));
    await expect(page.locator('#detail .source-list a')).toHaveCount(entry.sourceIds.length);
    await page.locator('#county').selectOption('');
  }
});

for (const width of [320, 768, 1024, 1440]) {
  test(`expanded guide fits ${width}px and selected detail remains usable`, async ({ page }) => {
    await page.setViewportSize({width, height: 1000});
    await open(page);
    await page.locator('#query').fill('Nantahala');
    await page.locator('#water-list summary').click();
    await page.locator('.water-button').click();
    await expect(page.locator('#detail .planning-note')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.angler-guide').evaluateAll(guides => guides.every(g => g.scrollWidth <= g.clientWidth))).toBe(true);
    // Expanded reading may scroll inside the compact sidebar; every section and
    // the final source must be reachable, not forced into an uncapped container.
    const row = page.locator('#water-list > li');
    for (const content of [row.locator('.planning-note'), row.locator('.source-list a').last()]) {
      await content.scrollIntoViewIfNeeded();
      expect(await content.evaluate(async el => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rect = el.getBoundingClientRect();
        const clip = el.closest('.schedule').getBoundingClientRect();
        // Native scrolling rounds scroll offsets to whole CSS pixels.
        return rect.top >= Math.max(0, clip.top) - 1 && rect.bottom <= Math.min(innerHeight, clip.bottom) + 1;
      })).toBe(true);
    }
    await page.locator('#water-list summary').scrollIntoViewIfNeeded();
    await page.screenshot({path: `test-results/guide-${width}.png`, fullPage: true});
  });
}

test('expanded guides pass automated accessibility with shared trip context', async ({ page }) => {
  await open(page);
  await page.locator('#query').fill('Nantahala');
  await page.locator('#water-list summary').click();
  await page.locator('.water-button').click();
  await expect(page.locator('#notes-heading')).toHaveText('Before you head out');
  const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('guide prose and source labels render as text, not HTML', async ({ page }) => {
  const injection = '<img src=x onerror="window.guideInjected=true">';
  await page.route('**/data/angler-guide.json', async route => {
    const response = await route.fetch();
    const guide = await response.json();
    guide.entries[0].summary = injection + guide.entries[0].summary;
    guide.sources.find(source => source.id === 18).title = injection;
    await route.fulfill({response, json: guide});
  });
  await open(page);
  const row = page.locator('#water-list li[data-water-id="ashe-helton-creek"]');
  await row.locator('summary').click();
  await expect(row.locator('.angler-summary')).toContainText(injection);
  await expect(row.locator('.source-list a[data-source-id="18"]')).toContainText(injection);
  await expect(page.locator('.angler-guide img')).toHaveCount(0);
  expect(await page.evaluate(() => window.guideInjected)).toBeUndefined();
});

test('unsafe source URLs fail closed with the existing local-data error', async ({page}) => {
  await page.route('**/data/angler-guide.json', async route => {
    const response = await route.fetch();
    const guide = await response.json();
    guide.sources[0].url = 'javascript:alert(1)';
    await route.fulfill({response, json: guide});
  });
  await page.goto('./');
  await expect(page.locator('#load-error')).toBeVisible();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});
