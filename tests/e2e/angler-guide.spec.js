import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { dateLabel } from '../../src/model.js';
const waters = JSON.parse(readFileSync(new URL('../../public/data/waters.json', import.meta.url)));
async function open(page) {
  await page.goto('./');
  await expect(page.locator('#count')).toHaveText('33 of 33 waters');
}

test('all 33 compact listings select their approved detail guide, designation, date and safe sources', async ({ page, request }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('#water-list > li')).toHaveCount(33);
  await expect(page.locator('#water-list .water-button')).toHaveCount(33);
  await expect(page.locator('#water-list details, #water-list .angler-guide, #water-list a')).toHaveCount(0);
  expect(await page.locator('#water-list > li').evaluateAll(rows => rows.every(row => row.children.length === 1 && row.firstElementChild.matches('button.water-button')))).toBe(true);
  const guide = await (await request.get('data/angler-guide.json')).json();
  for (const water of waters) {
    const entry = guide.entries.find(e => e.id === water.id);
    const row = page.locator(`#water-list li[data-water-id="${water.id}"]`);
    await row.locator('.water-button').click();
    const detail = page.locator('#detail');
    await expect(detail.locator('.angler-summary')).toHaveText(entry.summary);
    await expect(detail.locator('.planning-note')).toHaveText('Trip-planning note: ' + entry.planningNote);
    await expect(detail.locator('.section-description')).toHaveText(water.section);
    await expect(detail).toContainText('Delayed harvest');
    await expect(detail.locator('.stock-date')).toHaveText('Scheduled: ' + dateLabel(water.date));
    await expect(detail.locator('time[datetime="2026-10-23"]')).toHaveText('October 23, 2026');
    await expect(detail.locator('.source-list a')).toHaveCount(entry.sourceIds.length);
    for (const id of entry.sourceIds) {
      const source = guide.sources.find(s => s.id === id);
      await expect(detail.locator(`.source-list a[data-source-id="${id}"]`)).toHaveAttribute('href', source.url);
    }
    const expectedCitations = [...(entry.summary + entry.planningNote).matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
    expect(await detail.locator('.citation').evaluateAll(links => links.map(a => Number(a.dataset.sourceId)))).toEqual(expectedCitations);
    const safe = await detail.locator('.angler-guide a').evaluateAll(links => links.every(a => a.protocol === 'https:' && a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer') && a.getAttribute('aria-label')));
    expect(safe).toBe(true);
  }
  expect(await page.locator('.explorer').textContent()).not.toMatch(/Editorial verification|proofread|citationEvidence|evidenceNotes|review draft|\/home\//i);
  expect(errors).toEqual([]);
});

test('list and map selection expose the same guide and retain delayed keyboard focus', async ({ page, request }) => {
  await open(page);
  const guide = await (await request.get('data/angler-guide.json')).json();
  for (const water of waters.filter(w => ['jackson-tuckasegee-river', 'swain-tuckasegee-river', 'watauga-watauga-river', 'wilkes-elk-creek'].includes(w.id))) {
    await page.locator('#query').fill(water.name);
    await page.locator('#county').selectOption(water.county);
    const button = page.locator(`#water-list .water-button[data-id="${water.id}"]`);
    await button.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(700); // Leaflet's delayed focus/cluster cleanup.
    await expect(button).toBeFocused();
    const entry = guide.entries.find(e => e.id === water.id);
    await expect(page.locator('#detail .angler-summary')).toHaveText(entry.summary);
    await expect(page.locator('#detail .planning-note')).toHaveText('Trip-planning note: ' + entry.planningNote);
    const marker = page.locator('.date-marker.selected');
    await marker.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    await expect(page.locator('.date-marker.selected')).toBeFocused();
    await expect(page.locator('#detail .angler-summary')).toHaveText(entry.summary);
    await expect(page.locator('#detail .source-list a')).toHaveCount(entry.sourceIds.length);
    await page.locator('#county').selectOption('');
  }
});

for (const width of [320, 768, 1024, 1440]) {
  test(`selected guide fits ${width}px and its final source remains readable`, async ({ page }) => {
    await page.setViewportSize({width, height: 1000});
    await open(page);
    await page.locator('#query').fill('Nantahala');
    await page.locator('.water-button').click();
    await expect(page.locator('#detail .planning-note')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.angler-guide').evaluateAll(guides => guides.every(g => g.scrollWidth <= g.clientWidth))).toBe(true);
    for (const content of [page.locator('#detail .planning-note'), page.locator('#detail .source-list a').last()]) {
      await content.scrollIntoViewIfNeeded();
      expect(await content.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= -1 && rect.bottom <= innerHeight + 1;
      })).toBe(true);
    }
    if (width === 320) {
      expect(await page.locator('.schedule').evaluate(el => {
        const panel = document.querySelector('.map-panel').getBoundingClientRect();
        return el.getBoundingClientRect().top >= panel.bottom - 1 && getComputedStyle(el).overflowY === 'visible' && el.scrollHeight === el.clientHeight;
      })).toBe(true);
    }
    await page.screenshot({path: `test-results/guide-${width}.png`, fullPage: true});
  });
}

test('selected guide passes automated accessibility with shared trip context', async ({ page }) => {
  await open(page);
  await page.locator('#query').fill('Nantahala');
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
  await page.locator('#water-list .water-button[data-id="ashe-helton-creek"]').click();
  await expect(page.locator('#detail .angler-summary')).toContainText(injection);
  await expect(page.locator('#detail .source-list a[data-source-id="18"]')).toContainText(injection);
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
