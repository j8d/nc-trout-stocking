# NC Trout Stocking Map

## Objective / approved scope
Ryan requested an interactive, public map of all 33 waters and stocking dates on NC Wildlife's delayed-harvest schedule, in a new public j8d repository and published to GitHub Pages (J8D-31). The supplied schedule is November 2026, not the entire fall season. Scope is a dated snapshot, not a promise of automatic updates.

Assumptions: modern mobile/desktop browsers; no backend, paid services, accounts, analytics or API keys; official GIS section geometry with a representative marker (never an exact release/access/parking point). Check the official schedule before travel. Routine implementation and publishing are authorized by the request.

## Stack and structure
Vanilla JavaScript ES modules, Vite for asset-relative builds, locally bundled Leaflet. `src/` for presentation and filter logic; `public/data/` for schedule and GeoJSON; `sources/` for source snapshots and provenance; `scripts/` for reproducible data/build validation; `tests/` for Node tests and Playwright browser flows. All asset URLs must work at `/nc-trout-stocking/`.

## Commands
- Install: `npm ci`
- Develop: `npm run dev -- --host 127.0.0.1`
- Unit/data checks: `npm test`
- Build: `npm run build`
- Browser tests: `npm run test:e2e`
- Preview: `npm run preview -- --host 127.0.0.1`

## Acceptance criteria
1. Exactly 33 distinct county-water entries, matching every official November 2026 date, including both Tuckasegee entries.
2. Every entry has traceable official location data. Rivers show designated sections when available; markers are explicitly representative, not release or access locations.
3. Clickable map markers/sections and searchable, date-sorted keyboard-accessible list; search, county and date filters combine and reset. Empty results are clear.
4. Selection identifies name, county, full date, section description, location caveat and official source links. Filters and selection can be shared in the URL.
5. Responsive at 320, 768, 1024 and 1440 pixels; map does not trap page navigation. Non-map list remains useful if tiles fail.
6. Visible official source, snapshot date, unofficial status, schedule-change caveat and current-regulations link.
7. Automated data/logic and browser tests gate the same commit deployed by GitHub Actions. Verify the public site independently after deployment.

## Code style and boundaries
Use named pure functions for data transformations, native controls and explicit DOM APIs for source-derived text. Example: `filterWaters(waters, { query: 'Helton', county: 'Ashe', date: '' })`. No dynamic HTML insertion of external data; no secrets or core Hermes changes. Source data is a committed snapshot, not a runtime ArcGIS dependency. Basemap requests go to OpenStreetMap and carry attribution; describe third-party requests in the README.

## Plan / checkpoints
1. Fetch/validate schedule and current official GIS; record field mappings, aliases and feature IDs.
2. Build and exercise primary map/list/filter flow, with lightweight field-guide styling documented in DESIGN.md.
3. Test data completeness, filter combinations, deep links, keyboard/mobile flows, accessibility and failure behavior.
4. Review, publish a tested build through Pages, then verify live URL and all 33 entries.
