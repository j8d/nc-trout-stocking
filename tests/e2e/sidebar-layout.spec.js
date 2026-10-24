import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const guide = JSON.parse(readFileSync(new URL('../../public/data/angler-guide.json', import.meta.url)));
const byLength = [...guide.entries].sort((a, b) =>
  (a.summary.length + a.planningNote.length + a.sourceIds.length * 120)
  - (b.summary.length + b.planningNote.length + b.sourceIds.length * 120));

async function geometry(page) {
  return page.locator('.schedule').evaluate(async schedule => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
    return {
      schedule: rect(schedule), panel: rect(document.querySelector('.map-panel')),
      explorer: rect(document.querySelector('.explorer')),
      detail: rect(document.querySelector('#detail')),
      notes: rect(document.querySelector('.field-notes')),
      clientHeight: schedule.clientHeight, scrollHeight: schedule.scrollHeight,
      overflow: getComputedStyle(schedule).overflowY,
    };
  });
}

async function expectAligned(page, overflowing = false) {
  const actual = await geometry(page);
  expect(Math.abs(actual.schedule.top - actual.panel.top), JSON.stringify(actual)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.schedule.bottom - actual.panel.bottom), JSON.stringify(actual)).toBeLessThanOrEqual(1);
  expect(Math.abs(actual.schedule.bottom - actual.explorer.bottom), JSON.stringify(actual)).toBeLessThanOrEqual(1);
  // Catch a stretched outer shell with an inner 820px scrollport still ending early.
  expect(Math.abs(actual.clientHeight - actual.panel.height), JSON.stringify(actual)).toBeLessThanOrEqual(1);
  expect(actual.overflow).toBe('auto');
  expect(actual.notes.top).toBeGreaterThanOrEqual(actual.explorer.bottom);
  if (overflowing) expect(actual.scrollHeight).toBeGreaterThan(actual.clientHeight);
  else expect(actual.scrollHeight).toBe(actual.clientHeight);
  return actual;
}

for (const width of [768, 1024, 1440]) {
  test(`sidebar tracks full right-panel content through all 33 selections and filters at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('./');
    await expect(page.locator('#count')).toHaveText('33 of 33 waters');
    const initial = await expectAligned(page, true);

    // Exercise long/short guide swaps first, then every guide with the full list.
    const heights = [];
    for (const entry of [byLength.at(-1), byLength[0], ...guide.entries]) {
      await page.locator(`#water-list .water-button[data-id="${entry.id}"]`).click();
      await expect(page.locator('#detail .angler-summary')).toHaveText(entry.summary);
      const actual = await expectAligned(page, true);
      heights.push(actual.detail.height);
      expect(actual.panel.height).toBeGreaterThan(initial.panel.height);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(30);

    // Scroll directly, not by offscreen focus/locator auto-scroll: final row must
    // be inside the actual full-height scrollport, with no fixed-height ancestor.
    const reach = await page.locator('.schedule').evaluate(async schedule => {
      schedule.scrollTop = schedule.scrollHeight;
      await new Promise(resolve => requestAnimationFrame(resolve));
      const last = schedule.querySelector('li:last-child .water-button').getBoundingClientRect();
      const clip = schedule.getBoundingClientRect();
      return { top: last.top, bottom: last.bottom, clipTop: clip.top, clipBottom: clip.bottom, scrollTop: schedule.scrollTop };
    });
    expect(reach.scrollTop).toBeGreaterThan(0);
    expect(reach.top).toBeGreaterThanOrEqual(reach.clipTop - 1);
    expect(reach.bottom).toBeLessThanOrEqual(reach.clipBottom + 1);

    await page.locator('#query').fill('Nantahala');
    await expect(page.locator('#count')).toHaveText('1 of 33 waters');
    const single = await expectAligned(page);
    expect(single.panel.height).toBeLessThanOrEqual(initial.panel.height + 1);
    await page.locator('.water-button').click();
    const selected = await expectAligned(page);
    expect(selected.panel.height).toBeGreaterThan(single.panel.height);
    await page.locator('#query').fill('no matching water anywhere');
    await expect(page.locator('#count')).toHaveText('0 of 33 waters');
    await expect(page.locator('#empty')).toBeVisible();
    const empty = await expectAligned(page);
    expect(empty.panel.height).toBeLessThan(selected.panel.height);
    await page.locator('#empty-reset').click();
    await expect(page.locator('#count')).toHaveText('33 of 33 waters');
    const reset = await expectAligned(page, true);
    expect(Math.abs(reset.panel.height - initial.panel.height)).toBeLessThanOrEqual(1);

    await page.goto(`./?water=${byLength.at(-1).id}`);
    await expect(page.locator('#detail .angler-summary')).toHaveText(byLength.at(-1).summary);
    await expectAligned(page, true); // URL-selected first render, not only clicks.
  });
}

for (const width of [768, 1440]) {
  test(`unfiltered final row is keyboard reachable and retains focus after selection at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('./');
    await expect(page.locator('#count')).toHaveText('33 of 33 waters');
    const last = page.locator('#water-list .water-button').last();
    await expect(last.locator('.water-label strong')).toHaveText('North Toe River');
    for (let i = 0; i < 80 && !await last.evaluate(el => el === document.activeElement); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(last).toBeFocused();
    expect(await page.locator('.schedule').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700); // Delayed Leaflet animation cleanup.
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#detail h3')).toHaveText('North Toe River');
    expect(await last.evaluate(el => {
      const r = el.getBoundingClientRect(), clip = el.closest('.schedule').getBoundingClientRect();
      return r.top >= Math.max(0, clip.top) - 1 && r.bottom <= Math.min(innerHeight, clip.bottom) + 1;
    })).toBe(true);
    await expectAligned(page, true);
  });
}
