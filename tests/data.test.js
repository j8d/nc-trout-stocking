import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const waters = JSON.parse(readFileSync(new URL('../public/data/waters.json', import.meta.url)));
const sections = JSON.parse(readFileSync(new URL('../public/data/sections.geojson', import.meta.url)));
const csv = readFileSync(new URL('../sources/november-2026.csv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1).map(line => line.split(',').map(cell => cell.trim()));
const official = JSON.parse(readFileSync(new URL('../sources/delayed-harvest.geojson', import.meta.url)));
const crosswalk = JSON.parse(readFileSync(new URL('../sources/county-water-official-feature-ids.json', import.meta.url)));
const searchRows = JSON.parse(readFileSync(new URL('../sources/official-search-rows.json', import.meta.url)));
const provenance = JSON.parse(readFileSync(new URL('../sources/provenance.json', import.meta.url)));

test('all 33 unique county-water rows match the official CSV date exactly', () => {
  assert.equal(waters.length, 33);
  assert.equal(csv.length, 33);
  assert.equal(new Set(waters.map(w => w.id)).size, 33);
  assert.equal(new Set(waters.map(w => `${w.county}|${w.name}`)).size, 33);
  for (const [county, name, day] of csv) {
    const water = waters.find(w => w.county === county && w.name === name);
    assert.ok(water, `Missing ${county}/${name}`);
    assert.equal(water.date, `2026-11-${day.padStart(2, '0')}`);
  }
});

function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function sourceKey(feature) {
  return feature.properties.OBJECTID_12 !== undefined
    ? `streams:${feature.properties.OBJECTID_12}` : `impoundments:${feature.properties.FID}`;
}

test('every water has official feature IDs and a marker on its river or inside its lake', () => {
  for (const water of waters) {
    assert.ok(water.section.length > 10, `No section description: ${water.id}`);
    assert.ok(water.featureIds.length > 0, `No official IDs: ${water.id}`);
    assert.ok(water.lat > 34.9 && water.lat < 36.7, water.id);
    assert.ok(water.lng > -84.5 && water.lng < -80.2, water.id);
    const features = sections.features.filter(f => f.properties.waterId === water.id);
    assert.ok(features.length, `No geometry: ${water.id}`);
    const isLake = features[0].geometry.type === 'Polygon';
    if (isLake) {
      assert.ok(features.some(f => insideRing([water.lng, water.lat], f.geometry.coordinates[0])
        && !f.geometry.coordinates.slice(1).some(ring => insideRing([water.lng, water.lat], ring))), water.id);
    } else {
      const points = features.flatMap(f => f.geometry.coordinates.flat(Infinity));
      let match = false;
      for (let index = 0; index < points.length; index += 2) {
        if (Math.abs(points[index] - water.lng) < .000001 && Math.abs(points[index + 1] - water.lat) < .000001) match = true;
      }
      assert.ok(match, `Marker is not on geometry: ${water.id}`);
    }
    const layer = isLake ? 'impoundments' : 'streams';
    for (const id of water.featureIds) assert.ok(official.features.some(f => sourceKey(f) === `${layer}:${id}`), `Unknown source feature ${layer}:${id}`);
  }
});

test('every rendered section corresponds to a water and preserves original geometry', () => {
  for (const feature of sections.features) {
    const water = waters.find(w => w.id === feature.properties.waterId);
    assert.ok(water);
    const source = official.features.find(f => sourceKey(f) === sourceKey(feature));
    assert.ok(source);
    assert.deepEqual(feature.geometry, source.geometry);
  }
});

test('county-separated Tuckasegee waters do not share geometries or dates', () => {
  const pair = waters.filter(w => w.name === 'Tuckasegee River');
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0].date, pair[1].date);
  assert.notEqual(pair[0].county, pair[1].county);
  assert.ok(pair[0].featureIds.every(id => !pair[1].featureIds.includes(id)));
});

test('every county-water mapping agrees with the independent official reach crosswalk', () => {
  for (const water of waters) {
    const entry = crosswalk.find(row => row.county === water.county && row.water === water.name);
    assert.ok(entry, water.id);
    const name = provenance.aliases[water.name] || water.name;
    const countyMatches = searchRows.filter(row => row.county === water.county && row.water === name);
    assert.ok(countyMatches.length, water.id);
    assert.deepEqual([...new Set(countyMatches.map(row => row.Excel_ID))].sort((a, b) => a - b), entry.Excel_IDs);
    const expected = official.features.filter(feature => entry.Excel_IDs.includes(feature.properties.Excel_ID)
      && entry.object_id_field in feature.properties).map(feature => feature.properties[entry.object_id_field]).sort((a, b) => a - b);
    assert.deepEqual(water.featureIds, expected, water.id);
  }
  assert.equal(sections.features.length, 38);
  assert.equal(new Set(sections.features.map(sourceKey)).size, 38);
});

test('provenance records official schedule and current GIS source, not a geocoded guess', () => {
  assert.match(provenance.scheduleUrl, /^https:\/\/www.ncwildlife.gov\//);
  assert.match(provenance.gisUrl, /^https:\/\/[^/]*(ncpaws.org|ncwildlife.gov)\//);
  assert.equal(provenance.retrieved, '2026-10-23');
});
