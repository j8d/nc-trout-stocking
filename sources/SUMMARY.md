# NC Wildlife delayed-harvest GIS research

## Result

All **33 November 2026 county/water schedule rows** map to the current official **2026–2027** NCWRC services: **36 stream features + 2 lake polygons = 38 features**. No coordinates were invented and no third-party 2018 mirror is needed.[2][20][13]

## Authority and discovery chain

The NC Wildlife trout page links to both the NCPAWS Fishing Areas map and Public Mountain Trout Waters Search.[1] The live map HTML sets `agolMapKey = "3ff9a9fb82ab4d26a1fb80c8b2eb13e4"`.[4] Its ArcGIS item is titled `NCWRC Fishing Areas (2026 - 2027) v1`, and its operational layers reference the two services below.[6][7] Both service items are owned by `ncwildlife.gov`; their descriptions explicitly cover August 1, 2026–July 31, 2027.[11][12]

Official map: https://www.ncpaws.org/ncwrcmaps/fishingareas

Official county/reach search: https://www.ncpaws.org/PMTWS/TroutSearch.aspx (POST search with `countySel=0`, `classificationSel=3`, `__EVENTTARGET=searchBtn` plus form state; HTML response saved). Its results map county/water/reach to `PMTWStreamID`, which the official JS queries against `Excel_ID`.[3][5]

## Exact service URLs and fields

### Streams

https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0

- Geometry: `esriGeometryPolyline`; object ID: `OBJECTID_12`; common reach key: `Excel_ID`; no GlobalID field.[9]
- ArcGIS item: https://www.arcgis.com/home/item.html?id=51308f270e5847539d6ea58199500d6b
- Item modified: 2026-08-03T14:13:01+00:00; data last edit: 2026-07-30T13:14:10.597000+00:00.[11][9]
- All field names: `OBJECTID_12`, `Excel_ID`, `Displ_Name`, `MHTW_Reach`, `FIRST_Reg_Name`, `FIRST_Reg_Descri`, `FIRST_WRC_CLASS`, `FIRST_MHTW_City`, `WRC_Class`, `WEB_Refere`, `Shape__Length`.[9]

### Impoundments

https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0

- Geometry: `esriGeometryPolygon`; object ID: `FID`; common reach key: `Excel_ID`; no GlobalID field.[10]
- ArcGIS item: https://www.arcgis.com/home/item.html?id=79a47dd972db4e429f138306121bbdd3
- Item modified: 2026-08-03T14:14:45+00:00; data last edit: 2026-07-10T21:04:44.284000+00:00.[12][10]
- All field names: `FID`, `Excel_ID`, `WRC_Class`, `Reg_Descri`, `GNIS_Name`, `Reg_Name`, `DISPL_NAME`, `Stream_Nam`, `WEB_Refere`, `MtnHeritag`, `MHTW_City`, `MHTW_Reach`, `Shape_Leng`, `CNTY_Name`, `Shape__Area`, `Shape__Length`.[10]

**Critical stream schema pitfall:** filter `FIRST_WRC_CLASS = 'Delayed Harvest Trout Waters'`, NOT `WRC_Class`, which is null in the current streams service. Use `FIRST_Reg_Name` as canonical name (`Displ_Name` is blank for one Cane Creek segment) and `FIRST_Reg_Descri` for designated reach. Streams have **no county field**; county comes from official Trout Search via `Excel_ID`.[19][20][3]

**Lakes:** filter `WRC_Class = 'Delayed Harvest Trout Waters'`. Name fields are `Reg_Name` / `DISPL_NAME`, county is `CNTY_Name`, and `Reg_Descri` is `entire impoundment`. Lake Coffey has GNIS name `Coffee Lake` but official regulatory/display name `Lake Coffey`; do not join solely on GNIS name.[13]

Both layers natively use Web Mercator (`102100`, latest `3857`), support `JSON, geoJSON, PBF`, allow public Query, and have maxRecordCount 2000.[9][10] The saved geometry queries request `outSR=4326`, returning longitude/latitude GeoJSON.[15][21] Server count-only checks independently returned 36 and 2, matching downloaded counts; no transfer-limit truncation.[22][17]

### Complete downloadable query URLs

https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0/query?f=geojson&where=FIRST_WRC_CLASS+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326

https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0/query?f=geojson&where=WRC_Class+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326

## All 33 schedule rows and official IDs

IDs below are service object IDs; `Excel_ID` is the official crosswalk/reach key. Keep all features per water, not only the first matching feature.[3][20][13]

| County | Schedule water | November date | Layer | Object IDs | Excel_IDs |
|---|---|---|---|---|---|
| Ashe | Helton Creek | 2026-11-02 | streams | 15 | 24 |
| Ashe | Trout Lake | 2026-11-12 | impoundments | 13 | 26 |
| Ashe | Big Horse Creek | 2026-11-03 | streams | 14 | 23 |
| Ashe | South Fork New River | 2026-11-12 | streams | 16 | 25 |
| Burke | Jacob Fork | 2026-11-04 | streams | 91 | 90 |
| Caldwell | Wilson Creek | 2026-11-04 | streams | 110 | 103 |
| Clay | Fires Creek | 2026-11-03 | streams | 128 | 129 |
| Graham | Big Snowbird | 2026-11-05 | streams | 133 | 137 |
| Haywood | West Fork Pigeon River | 2026-11-09 | streams | 145 | 159 |
| Henderson | North Fork Mills River | 2026-11-03 | streams | 153 | 172 |
| Jackson | Tuckasegee River | 2026-11-03 | streams | 171, 172, 173 | 187 |
| Macon | Nantahala | 2026-11-04 | streams | 194 | 215 |
| Madison | Big Laurel Creek | 2026-11-05 | streams | 202 | 235 |
| Madison | Shelton Laurel Creek | 2026-11-05 | streams | 203 | 236 |
| Madison | Spring Creek | 2026-11-05 | streams | 204 | 237 |
| McDowell | Curtis Creek | 2026-11-05 | streams | 225 | 259 |
| McDowell | Mill Creek | 2026-11-05 | streams | 226 | 260 |
| McDowell | Catawba River | 2026-11-05 | streams | 224 | 258 |
| Mitchell | Cane Creek | 2026-11-09 | streams | 232, 233 | 270 |
| Mitchell | North Toe River | 2026-11-13 | streams | 234 | 271 |
| Polk | Green River | 2026-11-10 | streams | 246 | 286 |
| Surry | Ararat River | 2026-11-12 | streams | 254 | 303 |
| Surry | Mitchell River | 2026-11-06 | streams | 255 | 304 |
| Swain | Tuckasegee River | 2026-11-04 | streams | 355 | 417 |
| Transylvania | East Fork French Broad River | 2026-11-10 | streams | 282 | 325 |
| Transylvania | Little River | 2026-11-10 | streams | 283 | 326 |
| Watauga | Watauga River | 2026-11-10 | streams | 291, 1809 | 345, 518 |
| Watauga | Lake Coffey | 2026-11-10 | impoundments | 12 | 346 |
| Wilkes | East Prong Roaring River | 2026-11-02 | streams | 313 | 374 |
| Wilkes | Stone Mountain Creek | 2026-11-02 | streams | 316 | 377 |
| Wilkes | Reddies River | 2026-11-03 | streams | 349 | 411 |
| Wilkes | Elk Creek | 2026-11-03 | streams | 314, 315 | 375, 376 |
| Yancey | Cane River | 2026-11-09 | streams | 363 | 419 |

## Matching and display caveats

- Jackson Tuckasegee is **3 features** (`171,172,173`) sharing `Excel_ID=187`; Swain is a separate reach (`355`, `Excel_ID=417`).[20]
- Mitchell Cane Creek is **2 features** (`232,233`) sharing `Excel_ID=270`; one blank display name must not be dropped.[20]
- Wilkes Elk Creek has **2 distinct official reaches** (`Excel_ID=375,376`, object IDs `314,315`). Watauga River also has **2 reaches** (`345,518`, object IDs `291,1809`). Include both under the relevant schedule water, but explicitly state that the schedule does not identify which sub-reach(es) receive fish on its single listed date.[20][2][3]
- Trout Lake (Ashe) is polygon `FID=13`, `Excel_ID=26`; Lake Coffey (Watauga) is polygon `FID=12`, `Excel_ID=346`. Render polygons rather than inventing lake points.[13]
- Schedule aliases: Graham `Big Snowbird` = official `(Big) Snowbird Creek`; Macon `Nantahala` = official `Nantahala River`.[2][3]
- Trout Search additionally lists South Fork New River under Watauga, with the same `Excel_ID=25` as Ashe; the November stocking schedule lists it under Ashe only. Follow the schedule’s 33 rows rather than treating every search row as a scheduled water.[2][3]
- These are **designated-water geometries**, not stocking release points, trailheads, or guaranteed lawful/public-access locations. If a marker is wanted, derive a representative point from the preserved geometry, label it approximate, and do not give it “exact stocking point” or “access” semantics.[11][12]

## Attribution and restrictions

NCWRC says: “Boundaries are approximate and should not be used for regulatory purposes.” Descriptions warn about private property and posted trespass signs. Both service items request this acknowledgement: “The source of the North Carolina Wildlife Resources Commission Public Mountain Trout Waters data is North Carolina Wildlife Resources Commission.” Include that attribution and link the current regulations, and do not imply that geometry grants access.[11][12]

## Files and verification

- `streams-delayed-harvest.json` and `.geojson`: untouched official 36-feature responses.
- `impoundments-delayed-harvest.json` and `.geojson`: untouched official 2-feature responses.
- `streams-layer.json`, `impoundments-layer.json`: metadata including complete field definitions.
- `streams-item.json`, `impoundments-item.json`: official provenance, dates, descriptions and licenseInfo.
- `webmap-item.json`, `webmap-data.json`, `FishingAreas.js`, `fishingareas.html`: authority/discovery evidence.
- `official-search-rows.json` and `trout-search-delayed-harvest.html`: official county/reach/Excel_ID crosswalk evidence.
- `official-november-2026-schedule.json`, `schedule.html`: parsed and original 33-row schedule.
- `county-water-official-feature-ids.json`: all 33 county/name keys to official feature and Excel IDs, names, reaches, exact per-water query URL.
- `november-2026-official-geometries.geojson`: merged 38-feature output with schedule county/name/date, copying original geometry unchanged.
- `validation.json`: passed counts, joins, finite-coordinate/nonempty-geometry/ring checks.
- `fetch-manifest.jsonl`, `citations.json`, `file-sha256.json`: retrieval URLs, citation ledger and file hashes.

Research only: no repository created or modified and nothing published. Initial local HTML parsing attempt lacked BeautifulSoup; stdlib parsing succeeded. Initial stream query against the misleading `WRC_Class` field returned zero; schema inspection and `FIRST_WRC_CLASS` corrected it. These are resolved research pitfalls, not remaining blockers.

Remaining uncertainty: schedule is water-level, not reach-level, for Elk Creek and Watauga River; no claim about exact releases within those multiple reaches is supported.

## Scratch-only app-ready companions

`waters.json` contains 33 rows in the requested `{id,county,name,date,lat,lng,section,featureIds}` shape. `sections.geojson` contains 38 official geometries with `properties.waterId` matching those row IDs. IDs use lowercase county-name slugs. `representative-point-provenance.json` records source layer, IDs and derivation method. These are research handoff artifacts, not repository changes.

All 31 stream representative points are verified exact vertices from official line geometry: choose the longest source path and the actual vertex nearest half its geodesic length. Both lake representatives are algorithmically derived interior points (widest interior horizontal segment at polygon bbox mid-latitude) and pass point-in-polygon checks. These are approximate display markers, not exact stocking or access points. Polygons/lines are copied unchanged from the official GeoJSON responses.

## Sources

[1] https://www.ncwildlife.gov/fish/trout-fishing-north-carolina
[2] https://www.ncwildlife.gov/delayed-harvest-schedule
[3] https://www.ncpaws.org/PMTWS/TroutSearch.aspx
[4] https://www.ncpaws.org/ncwrcmaps/fishingareas
[5] https://www.ncpaws.org/ncwrcmaps/js/FishingAreas.js
[6] https://www.arcgis.com/sharing/rest/content/items/3ff9a9fb82ab4d26a1fb80c8b2eb13e4?f=pjson
[7] https://www.arcgis.com/sharing/rest/content/items/3ff9a9fb82ab4d26a1fb80c8b2eb13e4/data?f=pjson
[9] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0?f=pjson
[10] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0?f=pjson
[11] https://www.arcgis.com/sharing/rest/content/items/51308f270e5847539d6ea58199500d6b?f=pjson
[12] https://www.arcgis.com/sharing/rest/content/items/79a47dd972db4e429f138306121bbdd3?f=pjson
[13] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0/query?f=pjson&where=WRC_Class+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326
[15] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0/query?f=geojson&where=WRC_Class+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326
[17] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Impoundments_2026/FeatureServer/0/query?f=pjson&where=WRC_Class+%3D+%27Delayed+Harvest+Trout+Waters%27&returnCountOnly=true
[19] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0/query?f=pjson&where=1%3D1&outFields=WRC_Class%2CFIRST_WRC_CLASS&returnDistinctValues=true&returnGeometry=false
[20] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0/query?f=pjson&where=FIRST_WRC_CLASS+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326
[21] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0/query?f=geojson&where=FIRST_WRC_CLASS+%3D+%27Delayed+Harvest+Trout+Waters%27&outFields=%2A&returnGeometry=true&outSR=4326
[22] https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/PMTW_Streams_2026/FeatureServer/0/query?f=pjson&where=FIRST_WRC_CLASS+%3D+%27Delayed+Harvest+Trout+Waters%27&returnCountOnly=true
