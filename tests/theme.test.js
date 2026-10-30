import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEME_KEY, readChoice, saveChoice, resolveTheme, safeStorage } from '../src/theme.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    data,
  };
}
const throwing = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('quota'); },
  removeItem() { throw new Error('blocked'); },
};

test('explicit light/dark beats the system preference; System follows it', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('saved choice is read back; missing or unknown values fall back to System', () => {
  assert.equal(readChoice(memoryStorage({ [THEME_KEY]: 'dark' })), 'dark');
  assert.equal(readChoice(memoryStorage({ [THEME_KEY]: 'light' })), 'light');
  assert.equal(readChoice(memoryStorage({ [THEME_KEY]: 'sepia' })), 'system');
  assert.equal(readChoice(memoryStorage()), 'system');
  assert.equal(readChoice(null), 'system');
});

test('explicit choices persist and System clears the override', () => {
  const storage = memoryStorage();
  assert.equal(saveChoice(storage, 'dark'), true);
  assert.equal(storage.data.get(THEME_KEY), 'dark');
  assert.equal(saveChoice(storage, 'system'), true);
  assert.equal(storage.data.has(THEME_KEY), false);
});

test('unavailable or throwing storage never breaks theming', () => {
  assert.equal(readChoice(throwing), 'system');
  assert.equal(saveChoice(throwing, 'dark'), false);
  assert.equal(saveChoice(null, 'light'), false);
  const blocked = Object.defineProperty({}, 'localStorage', { get() { throw new Error('SecurityError'); } });
  assert.equal(safeStorage(blocked), null);
});

test('pre-paint script in index.html uses the same storage key and precedence', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(script.includes(`"${THEME_KEY}"`));
  for (const [saved, systemDark] of [['dark', false], ['light', true], [null, true], [null, false], ['bad', true]]) {
    const root = { dataset: {} };
    new Function('localStorage', 'matchMedia', 'document', script)(
      { getItem: () => saved }, () => ({ matches: systemDark }), { documentElement: root });
    assert.equal(root.dataset.theme, resolveTheme(readChoice({ getItem: () => saved }), systemDark), `${saved}/${systemDark}`);
  }
  const root = { dataset: {} };
  new Function('localStorage', 'matchMedia', 'document', script)(throwing, () => ({ matches: true }), { documentElement: root });
  assert.equal(root.dataset.theme, 'dark');
});
