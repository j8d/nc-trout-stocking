import { readFileSync, writeFileSync } from 'node:fs';
import { validateGuide } from '../src/guide-model.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const guide = validateGuide(read('../sources/angler-guide.json'), read('../public/data/waters.json'));
const output = new URL('../public/data/angler-guide.json', import.meta.url);
const serialized = JSON.stringify(guide, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== serialized) throw new Error('Angler guide is stale; run npm run build:guide');
} else {
  writeFileSync(output, serialized);
}
console.log(`Angler guide ${process.argv.includes('--check') ? 'checked' : 'built'}: ${guide.entries.length} waters, ${guide.sources.length} sources`);
