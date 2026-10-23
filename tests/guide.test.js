import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateGuide, citationParts } from '../src/guide-model.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const waters = read('../public/data/waters.json');
const guide = read('../sources/angler-guide.json');

test('guide has exactly the 33 official IDs, public-only fields and resolvable sources', () => {
  assert.equal(guide.researched, '2026-10-23');
  assert.equal(validateGuide(guide, waters), guide);
  assert.deepEqual(Object.keys(guide).sort(), ['entries', 'researched', 'sources', 'version']);
  for (const entry of guide.entries) {
    assert.deepEqual(Object.keys(entry).sort(), ['id', 'planningNote', 'sourceIds', 'summary']);
    assert.ok(entry.summary.length > 100);
    assert.ok(entry.planningNote.length > 20);
  }
  for (const source of guide.sources) assert.deepEqual(Object.keys(source).sort(), ['id', 'title', 'url']);
  assert.doesNotMatch(JSON.stringify(guide), /editorial|proofread|evidenceNotes|citationEvidence|evidence_file|\/home\/|review draft/i);
  assert.equal(guide.sources.find(s => s.id === 105).url, 'https://lakes.hydro-derived.duke-energy.app/flowreleases/2');
  assert.match(guide.sources.find(s => s.id === 106).url, /^https:\/\/lakes\.hydro-derived\.duke-energy\.app\/recreation_calendar\//);
});

test('approved public prose remains unchanged for every water', () => {
  const copy = guide.entries.map(entry => [entry.id, entry.summary, entry.planningNote]);
  assert.equal(createHash('sha256').update(JSON.stringify(copy)).digest('hex'), 'd177fa93858492621a8d21a4ac2567cb1c194a2adbbe33cbbc918aa61c20d96a');
});

test('public guide is deterministically generated from its standalone sanitized source', () => {
  assert.deepEqual(read('../public/data/angler-guide.json'), guide);
  execFileSync(process.execPath, ['scripts/build_guide.mjs', '--check'], { cwd: new URL('..', import.meta.url) });
});

const changed = fn => { const copy = structuredClone(guide); fn(copy); return copy; };
test('guide validation rejects missing, duplicate and unrecognized water IDs', () => {
  for (const mutate of [g => g.entries.pop(), g => g.entries[0].id = g.entries[1].id, g => g.entries[0].id = 'other']) {
    assert.throws(() => validateGuide(changed(mutate), waters));
  }
});

test('guide validation rejects editorial fields, orphan citations and unlisted/unused source IDs', () => {
  for (const mutate of [
    g => g.entries[0].gaps = ['private'],
    g => g.sources[0].quotes = ['private'],
    g => g.editorial = 'private',
    g => g.entries[0].summary += '[999]',
    g => g.entries[0].sourceIds.push(999),
    g => g.entries[0].sourceIds = [],
    g => g.sources.push({id: 999, title: 'Unused', url: 'https://example.org/'}),
  ]) assert.throws(() => validateGuide(changed(mutate), waters));
});

test('source validation rejects executable, malformed, insecure and credential-bearing URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://example.org', '//example.org', 'not a url', 'https://user:pass@example.org/', 'https://example.org/\npath']) {
    assert.throws(() => validateGuide(changed(g => g.sources[0].url = url), waters), url);
  }
});

test('citation parsing preserves approved prose and exposes numbered links, not orphan text', () => {
  assert.deepEqual(citationParts('A <tag> & setting.[18][27] Next.'), [
    { text: 'A <tag> & setting.' }, { sourceId: 18 }, { sourceId: 27 }, { text: ' Next.' },
  ]);
  for (const entry of guide.entries) for (const key of ['summary', 'planningNote']) {
    const reconstructed = citationParts(entry[key]).map(p => p.text ?? `[${p.sourceId}]`).join('');
    assert.equal(reconstructed, entry[key]);
  }
});
