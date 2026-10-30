# Changelog

## Unreleased

### Added
- Dark mode with an accessible System/Light/Dark control. It follows the device setting until you choose, remembers an explicit choice on this device when storage is available, and themes the schedule, filters, guide, map controls, labels, legend and error states. The same OpenStreetMap tiles are dimmed for night viewing.
- Persistent water names on the map, independent of clustered date pins, with duplicate names qualified by county. Crowded names appear as space becomes available when zooming or filtering.
- Owner-only main merges, mandatory PR/CI rules and repository governance documentation.

### Changed
- Top-left icon/title now links home and clears filters, selection and deep links.
- Legend uses `#` rather than a fixed example stocking day.
- Schedule rows now show dates and names without repeated Angler guide disclosures; select a water to read the unchanged full guide below the map.

### Fixed
- Desktop/tablet schedule scrolling now extends alongside the entire map and selected-water detail, with the final row reachable and keyboard focus kept visible as details resize.

## 1.0.0

### Added
- Public interactive map of all 33 waters in NC Wildlife's November 2026 delayed-harvest trout stocking schedule.
- Official 2026–27 river sections and lake polygons, date pins and nearby-water clustering.
- Combined search, county and date filters; date-sorted keyboard-accessible schedule; shareable selections.
- Responsive layouts, source attribution, change/access caveats and locally bundled data fallback when map tiles fail.
- Data/logic/browser verification gates for GitHub Pages deployment.
