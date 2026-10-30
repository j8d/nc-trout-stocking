import test from 'node:test';
import assert from 'node:assert/strict';
import { BASEMAPS, IMAGERY_DETAIL_ZOOM, basemapNote, isBasemap, tileWarning } from '../src/basemap.js';

test('Map and Satellite are the only base maps, with keyless HTTPS tile URLs', () => {
  assert.deepEqual(Object.keys(BASEMAPS), ['map', 'satellite']);
  assert.deepEqual(Object.values(BASEMAPS).map(b => b.label), ['Map', 'Satellite']);
  for (const { url } of Object.values(BASEMAPS)) {
    assert.match(url, /^https:\/\//);
    assert.doesNotMatch(url, /key|token|access/i);
  }
  assert.equal(BASEMAPS.map.url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  assert.equal(BASEMAPS.satellite.url,
    'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}');
  assert.ok(isBasemap('satellite'));
  assert.ok(!isBasemap('hybrid'));
  assert.ok(!isBasemap('toString'));
});

test('both layers share a zoom range; imagery stops requesting at its last cached level', () => {
  assert.equal(BASEMAPS.map.options.maxZoom, BASEMAPS.satellite.options.maxZoom);
  assert.equal(IMAGERY_DETAIL_ZOOM, 16);
  assert.equal(BASEMAPS.satellite.options.maxNativeZoom, 16);
  assert.match(BASEMAPS.map.options.attribution, /OpenStreetMap/);
  assert.match(BASEMAPS.satellite.options.attribution, /USGS The National Map/);
});

test('imagery caveat and enlargement notice are explicit; the road map has none', () => {
  assert.equal(basemapNote('map', 18), '');
  assert.match(basemapNote('satellite', 12), /not live and does not show public access/);
  assert.doesNotMatch(basemapNote('satellite', 16), /enlarged/);
  assert.match(basemapNote('satellite', 17), /enlarged past its full detail/);
  assert.match(tileWarning('satellite'), /satellite imagery could not load/);
  assert.match(tileWarning('map'), /basemap tiles could not load/);
});
