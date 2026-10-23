export function filterWaters(waters, { query = '', county = '', date = '' } = {}) {
  const term = query.trim().toLowerCase();
  return waters.filter(w => (!term || `${w.name} ${w.county}`.toLowerCase().includes(term))
    && (!county || w.county === county) && (!date || w.date === date));
}

export function sortWaters(waters) {
  return [...waters].sort((a, b) => a.date.localeCompare(b.date)
    || a.county.localeCompare(b.county) || a.name.localeCompare(b.name));
}

export function dateLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${date}T12:00:00Z`));
}

export function readState(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(['query', 'county', 'date', 'water'].map(key => [key, params.get(key) || '']));
}

export function stateUrl(location, state) {
  const url = new URL(location);
  url.search = '';
  for (const key of ['query', 'county', 'date', 'water']) {
    if (state[key]) url.searchParams.set(key, state[key]);
  }
  url.hash = '';
  return url;
}
