import { test, expect } from '@playwright/test';

// Read geometry after native details layout and browser scroll anchoring settle.
async function bounds(locator) {
  return locator.evaluate(async element => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = element.getBoundingClientRect();
    const schedule = element.closest('.schedule');
    const clip = schedule.getBoundingClientRect();
    return {
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      clipTop: Math.max(0, clip.top), clipBottom: Math.min(innerHeight, clip.bottom),
      viewportWidth: innerWidth, scrollTop: schedule.scrollTop, scrollY,
    };
  });
}

async function expectReadable(locator) {
  const actual = await bounds(locator);
  expect(actual.top, JSON.stringify(actual)).toBeGreaterThanOrEqual(actual.clipTop);
  expect(actual.bottom, JSON.stringify(actual)).toBeLessThanOrEqual(actual.clipBottom);
  expect(actual.left).toBeGreaterThanOrEqual(0);
  expect(actual.right).toBeLessThanOrEqual(actual.viewportWidth);
  return actual;
}

for (const width of [768, 1440]) {
  for (const input of ['pointer', 'keyboard']) {
    test(`unfiltered lower-row guide keeps its ${input} trigger visible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('./');
      await expect(page.locator('#count')).toHaveText('33 of 33 waters');
      const rows = page.locator('#water-list > li');
      const lastRow = rows.last();
      await expect(lastRow.locator('.water-label strong')).toHaveText('North Toe River');
      const summary = lastRow.locator('summary');

      if (input === 'keyboard') {
        // Traverse the actual collapsed list, letting native focus scroll it.
        for (let i = 0; i < 100 && !await summary.evaluate(el => el === document.activeElement); i++) {
          await page.keyboard.press('Tab');
        }
        await expect(summary).toBeFocused();
      } else {
        await summary.scrollIntoViewIfNeeded();
      }
      expect(await page.locator('.schedule').evaluate(el => el.scrollTop)).toBeGreaterThan(1000);

      async function toggle(trigger, opening) {
        const before = await expectReadable(trigger);
        if (input === 'keyboard') {
          await expect(trigger).toBeFocused();
          await page.keyboard.press('Enter');
        } else {
          // Real pointer input, with no locator auto-scroll after activation.
          await page.mouse.click((before.left + before.right) / 2, (before.top + before.bottom) / 2);
        }
        if (opening) await expect(trigger.locator('..')).toHaveAttribute('open', '');
        else await expect(trigger.locator('..')).not.toHaveAttribute('open', '');
        const after = await expectReadable(trigger);
        expect(Math.abs(after.top - before.top), JSON.stringify({ before, after })).toBeLessThanOrEqual(1);
        if (input === 'keyboard') await expect(trigger).toBeFocused();
      }

      await toggle(summary, true);
      await toggle(summary, false);
      await toggle(summary, true);

      // Another lower row can open/close while the final guide stays open.
      const other = rows.nth(31).locator('summary');
      if (input === 'keyboard') {
        await page.keyboard.press('Shift+Tab'); // Final row's map button.
        await page.keyboard.press('Shift+Tab'); // Previous row's guide trigger.
        await expect(other).toBeFocused();
      } else {
        await other.scrollIntoViewIfNeeded();
      }
      await toggle(other, true);
      await toggle(other, false);
      await expect(lastRow.locator('details')).toHaveAttribute('open', '');

      // The full guide, including its final source, remains scroll-reachable.
      for (const content of [lastRow.locator('.planning-note'), lastRow.locator('.source-list a').last()]) {
        await content.scrollIntoViewIfNeeded();
        await expectReadable(content);
      }
    });
  }
}
