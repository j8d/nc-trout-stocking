const keysAre = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const requireValue = (condition, message) => { if (!condition) throw new Error(`Invalid angler guide: ${message}`); };
const text = value => typeof value === 'string' && value.trim().length > 0;

export function citationParts(value) {
  const parts = [];
  let offset = 0;
  for (const match of value.matchAll(/\[(\d+)\]/g)) {
    if (match.index > offset) parts.push({ text: value.slice(offset, match.index) });
    parts.push({ sourceId: Number(match[1]) });
    offset = match.index + match[0].length;
  }
  if (offset < value.length) parts.push({ text: value.slice(offset) });
  return parts;
}

// The same fail-closed whitelist guards the checked build and runtime data.
export function validateGuide(guide, waters) {
  requireValue(keysAre(guide, ['version', 'researched', 'entries', 'sources']), 'top-level fields');
  requireValue(guide.version === 1 && guide.researched === '2026-10-23', 'version/research date');
  requireValue(Array.isArray(guide.entries) && Array.isArray(guide.sources), 'collections');
  const sourceIds = new Set();
  for (const source of guide.sources) {
    requireValue(keysAre(source, ['id', 'title', 'url']), 'source fields');
    requireValue(Number.isSafeInteger(source.id) && source.id > 0 && !sourceIds.has(source.id), 'source ID');
    requireValue(text(source.title) && text(source.url) && !/[\u0000-\u0020\u007f]/.test(source.url), 'source text');
    let url;
    try { url = new URL(source.url); } catch { throw new Error('Invalid angler guide: source URL'); }
    requireValue(url.protocol === 'https:' && url.hostname && !url.username && !url.password, 'HTTPS source URL');
    sourceIds.add(source.id);
  }
  const expected = new Set(waters.map(water => water.id));
  const seen = new Set(), used = new Set();
  requireValue(expected.size === 33 && guide.entries.length === expected.size, '33 water entries');
  for (const entry of guide.entries) {
    requireValue(keysAre(entry, ['id', 'summary', 'planningNote', 'sourceIds']), 'entry fields');
    requireValue(expected.has(entry.id) && !seen.has(entry.id), 'water membership');
    seen.add(entry.id);
    requireValue(text(entry.summary) && text(entry.planningNote), 'approved text');
    requireValue(!/editorial verification|proofread|review draft|\/home\//i.test(entry.summary + entry.planningNote), 'public text');
    requireValue(Array.isArray(entry.sourceIds) && entry.sourceIds.length > 0
      && new Set(entry.sourceIds).size === entry.sourceIds.length, 'entry sources');
    const cited = new Set(citationParts(entry.summary + entry.planningNote).filter(p => p.sourceId !== undefined).map(p => p.sourceId));
    requireValue(cited.size === entry.sourceIds.length && entry.sourceIds.every(id => cited.has(id) && sourceIds.has(id)), 'citation lookup');
    entry.sourceIds.forEach(id => used.add(id));
  }
  requireValue(used.size === sourceIds.size, 'no unused sources');
  return guide;
}
