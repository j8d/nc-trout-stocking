# North Carolina trout stocking map

**Public map: https://j8d.github.io/nc-trout-stocking/**

An independent, mobile-friendly map of all **33 county/water entries in NC Wildlife's November 2026 delayed-harvest stocking schedule**. Search by water or county, combine county/date filters, click date pins or mapped sections, and share the resulting URL.

This is a dated snapshot, **not the full fall schedule** and not a live stocking confirmation feed. Check the [official schedule](https://www.ncwildlife.gov/delayed-harvest-schedule) before traveling. Scheduled dates may change.

## Data and location method

- Schedule: [NC Wildlife's November 2026 schedule](https://www.ncwildlife.gov/delayed-harvest-schedule), page last modified October 20, 2026; retrieved October 23, 2026. The original export is committed at `sources/november-2026.csv`.
- Location data: NC Wildlife's designated delayed-harvest GIS sections. Exact query, retrieval information, aliases, feature IDs and generation method are recorded in `sources/provenance.json` and the data-generation script. The source GeoJSON is committed at `sources/delayed-harvest.geojson`; rendered geometry is copied without simplification to `public/data/sections.geojson`.
- A water is identified by **county plus schedule name**, not name alone. The Jackson and Swain Tuckasegee River entries are distinct, with different dates and geometries.
- Date pins are **representative water locations derived from official geometry**: source vertices on rivers and interior points within lake polygons, not exact stocking locations, public access, parking or navigation destinations. The schedule supplies a water and day, not release coordinates. Some waters consist of multiple designated stretches; read the section description and consult the official map and posted signs.
- The app bundles a local snapshot and does not depend on ArcGIS at runtime. To update it, refresh/review sources, adjust mappings as necessary, run `python3 scripts/build_data.py`, and run all tests. There is deliberately no unattended scraper silently changing dates or coordinates.

## Angler guides

Every schedule listing has an **Angler guide** disclosure with its official section/date, setting and access summary, public **Trip-planning note**, research date and clickable sources. Map/list selections show the same guide in the selected-water detail. These are researched planning descriptions, not live opening reports, safe-wading guarantees or catch predictions; retain their access/closure/flow cautions and check current sources before a trip.

The approved October 23, 2026 copy is stored independently in `sources/angler-guide.json`. It contains only water IDs, approved summary/planning text and cited-source references, plus a shared source lookup (ID/title/HTTPS URL). Private review notes and research evidence are not imported. Only sources actually cited by the public copy are retained, including Duke's current flow and upper-Nantahala bypass-release links.

`npm run build:guide` validates exact membership against all 33 IDs in `public/data/waters.json`, rejects unknown fields/orphan references/unsafe links, and deterministically writes `public/data/angler-guide.json`. `npm run build` includes this step. `npm test` checks that the committed public file is current. Normal builds/tests need only this repository, not the original research workspace. This does not modify the schedule/GIS generator or its outputs; a future water-ID change requires a reviewed guide update too.

## Run locally

Node.js 22.12+ and npm are required.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the printed `/nc-trout-stocking/` URL. Production-like preview:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

## Verify

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --audit-level=moderate
```

If Chromium is already installed, `CHROMIUM_PATH=/path/to/chrome npm run test:e2e` uses it. Test the public deployment with `LIVE_URL=https://j8d.github.io/nc-trout-stocking/ npm run test:e2e`.

Tests cover every schedule row/date, location provenance and geometry, filters, sorting, URL state, selection, keyboard journeys, 320/768/1024/1440px layouts, automated WCAG checks, tile failures and data-error fallback. Automated accessibility checks are not a substitute for a full assistive-technology audit.

## Publishing

GitHub Pages uses GitHub Actions. Pull requests run the same verification as `main`. Deployment depends on the verification job and publishes **that job's built artifact** only after data, unit, browser and dependency checks succeed. The Vite base path is `/nc-trout-stocking/`, so assets and data work on project Pages.

**Owner-controlled merges:** only `j8d` can merge through a PR. A PR and passing `verify` check are mandatory even for the owner. `j8d` alone can bypass the review requirement to handle self-authored PRs. Agents prepare PRs but do not approve or merge them. See [GOVERNANCE.md](GOVERNANCE.md) for active server rules, CODEOWNERS, verification commands and the public-review/shared-credential limitations.

## CI browser environment

The `verify` job runs inside the official `mcr.microsoft.com/playwright:v1.58.2-noble` image pinned by SHA-256 digest. It already includes Playwright's browser binaries and Linux dependencies, so CI does not run `playwright install --with-deps` or download fonts/libraries from an Ubuntu mirror on every run. `npm ci` still installs the project's matching Playwright package; the image intentionally does not replace npm dependencies.

When upgrading `@playwright/test`, update the image tag **and verified registry digest** together. `tests/ci-workflow.test.js` rejects a version mismatch and checks that audit, unit/data tests, build, browser tests, artifact upload and deployment gating remain present. An image pull still costs time; compare total job duration, not only the removed install step. This change does not alter local setup commands, required check name (`verify`), owner protections or the Pages deploy job.

References: [Playwright CI containers](https://playwright.dev/docs/ci#via-containers), [official image](https://playwright.dev/docs/docker).

## Architecture and privacy

Vanilla ES modules + Leaflet, built by Vite. No backend, logins, analytics, tracking scripts or API keys. Dependencies are bundled rather than loaded from a third-party script CDN. The basemap uses [OpenStreetMap standard tiles](https://operations.osmfoundation.org/policies/tiles/); tile requests expose the browser's IP and normal HTTP metadata to the tile provider. GitHub Pages serves the site and may retain its normal hosting logs. Do not prefetch or bulk-download tiles. Failed tiles leave the local water outlines, pins and complete list available.

The source-code license does not relicense official GIS/schedule content or OpenStreetMap data. OpenStreetMap attribution is shown on the map; official source attribution and limitations are displayed alongside the schedule. This project is not affiliated with or endorsed by the North Carolina Wildlife Resources Commission.

## Rollback

If a published change breaks dates, geometry or the primary flow, revert the offending commit on a short-lived branch, run verification, merge and let the same gated Pages workflow redeploy. There is no database or migration to undo. The first working publication is tagged `v1.0.0`; retain it as a known-good recovery point. Verify the public URL and data count after any rollback. Monitoring is limited to CI and live smoke checks; no visitor telemetry is collected.

See [SPEC.md](SPEC.md) and [DESIGN.md](DESIGN.md) for scope and interface decisions.
