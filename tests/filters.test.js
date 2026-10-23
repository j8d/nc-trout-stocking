import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWaters, sortWaters, dateLabel, readState, stateUrl } from '../src/model.js';

const waters = [
  { id: 'swain-tuckasegee', county: 'Swain', name: 'Tuckasegee River', date: '2026-11-04' },
  { id: 'ashe-helton', county: 'Ashe', name: 'Helton Creek', date: '2026-11-02' },
  { id: 'jackson-tuckasegee', county: 'Jackson', name: 'Tuckasegee River', date: '2026-11-03' }
];
test('search is case-insensitive and ignores surrounding whitespace', () => {
  assert.deepEqual(filterWaters(waters, { query: '  HELTON  ' }).map(w => w.id), ['ashe-helton']);
});
test('search matches county and retains two distinct Tuckasegee waters', () => {
  assert.equal(filterWaters(waters, { query: 'tuckasegee' }).length, 2);
  assert.equal(filterWaters(waters, { query: 'ashe' })[0].name, 'Helton Creek');
});
test('query, county, date compose with AND semantics', () => {
  assert.equal(filterWaters(waters, { query: 'tuckasegee', county: 'Swain', date: '2026-11-04' }).length, 1);
  assert.equal(filterWaters(waters, { county: 'Swain', date: '2026-11-03' }).length, 0);
});
test('empty filters return every water', () => assert.equal(filterWaters(waters, {}).length, 3));
test('sort is by date then county/name and does not mutate input', () => {
  assert.deepEqual(sortWaters(waters).map(w => w.date), ['2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(waters[0].county, 'Swain');
});
test('dates are calendar dates independent of browser timezone', () => {
  assert.equal(dateLabel('2026-11-02'), 'Monday, November 2, 2026');
});
test('share URLs preserve subpath, encode input, round-trip state and omit empty values', () => {
  const state = { query: 'north & south', county: 'Ashe', date: '2026-11-02', water: 'ashe-helton' };
  const url = stateUrl(new URL('https://example.org/nc-trout-stocking/?old=1'), state);
  assert.equal(url.pathname, '/nc-trout-stocking/');
  assert.deepEqual(readState(url.search), state);
  assert.equal(stateUrl(url, {}).search, '');
});
