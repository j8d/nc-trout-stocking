"""Rebuild local map files from reviewed official source snapshots (no network).
Run from repository root: python3 scripts/build_data.py
Refresh/review schedule, GIS source and county crosswalk together for a new edition.
"""
import csv
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'sources'
OUT = ROOT / 'public' / 'data'


def load(name):
    return json.loads((SOURCES / name).read_text())


def distance(a, b):
    p1, p2 = map(math.radians, [a[1], b[1]])
    delta_lat = p2 - p1
    delta_lon = math.radians(b[0] - a[0])
    h = math.sin(delta_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(delta_lon / 2) ** 2
    return 6371008.8 * 2 * math.asin(min(1, math.sqrt(h)))


def line_representative(features):
    candidates = []
    for feature in features:
        geometry = feature['geometry']
        paths = [geometry['coordinates']] if geometry['type'] == 'LineString' else geometry['coordinates']
        for path in paths:
            lengths = [0.0]
            for a, b in zip(path, path[1:]):
                lengths.append(lengths[-1] + distance(a, b))
            candidates.append((lengths[-1], path, lengths))
    length, path, lengths = max(candidates, key=lambda item: item[0])
    return path[min(range(len(path)), key=lambda i: abs(lengths[i] - length / 2))]


def inside_ring(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y):
            crossing = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x < crossing:
                inside = not inside
    return inside


def lake_representative(features):
    candidates = []
    for feature in features:
        rings = feature['geometry']['coordinates']
        outer = rings[0]
        y = (min(p[1] for p in outer) + max(p[1] for p in outer)) / 2
        crossings = []
        for ring in rings:
            for a, b in zip(ring, ring[1:]):
                if (a[1] > y) != (b[1] > y):
                    crossings.append(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
        crossings.sort()
        for a, b in zip(crossings[::2], crossings[1::2]):
            point = [(a + b) / 2, y]
            if inside_ring(point, outer) and not any(inside_ring(point, hole) for hole in rings[1:]):
                candidates.append((b - a, point))
    return max(candidates, key=lambda item: item[0])[1]


with (SOURCES / 'november-2026.csv').open(newline='') as source:
    schedule = [{key: value.strip() for key, value in row.items()} for row in csv.DictReader(source)]
assert len(schedule) == 33
crosswalk = load('county-water-official-feature-ids.json')
original = load('delayed-harvest.geojson')
waters, sections = [], []
for row in schedule:
    matches = [entry for entry in crosswalk if entry['county'] == row['County'] and entry['water'] == row['Stream']]
    assert len(matches) == 1, row
    entry = matches[0]
    features = [json.loads(json.dumps(feature)) for feature in original['features']
                if feature['properties'].get(entry['object_id_field']) in entry['official_feature_ids']
                and (entry['object_id_field'] in feature['properties'])]
    assert len(features) == len(entry['official_feature_ids']), entry
    water_id = re.sub(r'[^a-z0-9]+', '-', f"{row['County']}-{row['Stream']}".lower()).strip('-')
    point = line_representative(features) if entry['layer'] == 'streams' else lake_representative(features)
    water = dict(id=water_id, county=row['County'], name=row['Stream'],
                 date=f"2026-11-{int(row['November']):02}", lat=point[1], lng=point[0],
                 section='; '.join(dict.fromkeys(reach['reach'] for reach in entry['official_reaches'])),
                 featureIds=entry['official_feature_ids'])
    if len(entry['Excel_IDs']) > 1:
        water['scopeNote'] = 'Multiple designated reaches are shown. The schedule gives one date for this water and does not specify which sub-reaches receive fish.'
    waters.append(water)
    for feature in features:
        feature['properties'].update(waterId=water_id, source_layer=entry['layer'])
        sections.append(feature)
assert len(waters) == 33 and len(sections) == 38
OUT.mkdir(parents=True, exist_ok=True)
for name, content in [('waters.json', waters), ('sections.geojson', dict(type='FeatureCollection', features=sections))]:
    (OUT / name).write_text(json.dumps(content, indent=2, ensure_ascii=False) + '\n')
print(f'Generated {len(waters)} waters and {len(sections)} unchanged official geometries.')
