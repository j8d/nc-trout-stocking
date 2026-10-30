# Design: a practical mountain-water field guide

## Map / Satellite base map (J8D-43)

Audience/task: anglers find or select a water, switch to aerial imagery to read the surrounding terrain, then switch back without losing their place. Success: imagery gives orientation without hiding stocking information or interrupting the select/filter/share journey. This bounded control addition reuses established patterns, so a separate prototype phase was waived.

Control: a visible "Base map" radio group (Map/Satellite) in the map heading, beside Fit results. It uses the same `.segmented` native-radio component as Theme: one tab stop, arrow keys switch, 44px segments, a filled checked state and a rust focus ring. Below 768px the actions take a full row under the map heading. Map is the default. The choice lasts only for the visit and is not added to share URLs, so a shared link always opens on the familiar road map.

Behaviour: switching swaps only Leaflet's base tile layer. Sections, date pins, clusters, names, selection, filters, URL, center and zoom stay untouched, and Leaflet swaps the attribution. Both layers keep the same zoom range so the view never jumps. Imagery past level 16 is enlarged rather than re-requested, and a note under the map says so. Imagery is never requested before Satellite is chosen.

Legibility: theme and base map are independent. Dark mode still inverts only the road map; satellite imagery is never inverted. On imagery, the map panel overrides `--map-section`/`--map-selected` with light mint/coral and casts a thin dark casing on the section SVG. Lines then stay visible on both dark forest and bright fields in either theme, and the legend line follows the same token. Labels and pins keep their surface backgrounds and borders.

Feedback: a status line says "Loading satellite imagery…" until tiles arrive. While Satellite is shown, a caveat says the imagery is not live and does not establish public access or current conditions. If imagery fails, the existing warning names the satellite failure and offers **Switch back to Map**, which returns focus to the Map radio. Road-map failure keeps its original message without that button.

## Dark mode (J8D-41)

Audience/task: anglers checking dates and waters in a bright shop or a dark truck cab before dawn. Success: a discoverable theme choice that keeps the map readable and the search/select/share journey unchanged on mobile and desktop.

Control: a visible “Theme” radio group (System/Light/Dark) at the top right of the masthead; below 768px it takes its own full-width row under the title. Native radios keep arrow-key selection and one tab stop; segments are 44px tall and the checked one is filled, not only recolored. System is the default and follows `prefers-color-scheme`, including live OS changes. Light or Dark is saved as `nc-trout-theme` in `localStorage`; choosing System removes it. If storage is blocked the page follows the system and the choice lasts for the visit. A tiny inline head script applies the theme before first paint (no light flash); `src/theme.js` owns the same rules and tests check they agree.

Tokens: dark mode reassigns the existing pine-and-paper roles on `:root[data-theme="dark"]` rather than adding a second palette system. Paper/surface become deep green-black, ink pale, pine a light mint used for headings/links/fills, rust a lighter coral for selection and focus. Fills that carried white text use `--on-pine`/`--on-rust`. All text pairs meet 4.5:1 and field borders 3:1. Light values are unchanged.

Map: same OpenStreetMap tile URLs and attribution; in dark mode only the tile pane is inverted/hue-rotated so roads and water stay legible without glare. Sections, pins, clusters, name labels and leaders are drawn from tokens (section lines read `--map-section`/`--map-selected` because Leaflet writes SVG attributes) and restyle on theme change. Zoom/attribution controls take the dark surface. Tile failure and data errors keep their explicit messages with dark-safe warning/error tokens.

## Compact schedule and selected-water guide (J8D-36)

Audience/task: scan the November 2026 dates and names, then select a water to read its setting, access cautions and trip-planning advice. Success: all 33 waters remain single-button rows; list and map selection reveal the same full approved guide in the selected-water detail, without repeated disclosures in the list.

This small correction to established components waives a separate prototype/design phase. Reuse existing date/name/map buttons, tokens and detail presentation; add no panel or alternate guide action. Remove the old disclosure helper, markup, styles and instructions. Preserve approved summaries, public “Trip-planning note”, research date and per-water citations/sources exactly. Keep private editorial material out of the source/public data, not merely hidden.

Desktop/tablet: the entire right panel (heading, map, legend and selected detail) determines the bordered explorer's height. Size containment removes the schedule's intrinsic height from grid row sizing, while grid stretch makes the schedule itself the full-height scrollport. This avoids both a fixed cap and a long list stretching the page; no measurement JS or extra inner scrolling wrapper is needed. Its divider and scrollbar run to the explorer bottom, above “Before you head out”, not to the global footer. One-result and empty states remain only as tall as the right content. Below 768px, remove containment and retain the established map-first/list-after document flow.

Use existing pine links, paper surfaces, muted metadata and spacing. Numbered citations have accessible source names and inline hit areas, with a readable source list for touch users. Verify full approved guides for all 33 selections, actual schedule/client-height alignment at 768/1024/1440px through long/short/empty/filter-reset states, unfiltered final-row scroll reachability, keyboard selection including delayed map cleanup, readable detail sources and no horizontal overflow at 320px, and axe on selected content. Shared trip context remains in “Before you head out”.


Primary task: find a water near a chosen county or on a stocking date; inspect its designated section without mistaking the marker for an access or release point.

Map-first on desktop (date-sorted 340px sidebar + large map); map and list stacked on mobile. Filters are native, visibly labeled controls. Full list is the accessible alternative to map geometry. Selecting a list entry opens the same map detail; no modal or navigation trap. Minimal motion, no hero banner taking the map off screen.

Visual vocabulary: warm paper (#f6f4ee), deep pine (#193f38), dark ink (#1c302c), rust accent (#a53d20), subdued borders (#d6dcd4). System sans body, Georgia display title. Small uppercase labels; bold tabular stocking-date stamps. Dates printed on markers so meaning never relies on color. Border radii 6–10px, 4px spacing scale, controls at least 44px high. Focus outline is high-contrast rust, not a subtle color change.

Map semantics: solid pine strokes for official delayed-harvest sections, rust for selection; representative date markers along those sections. Explain them directly above the map. Never label a marker as an exact stocking point. Always retain attribution for the active base map. Basemap failure leaves local section outlines and complete list available.

Water names: a default-on, noninteractive label pane sits above sections and below date pins/clusters. Names use DOM text, remain independent of clustering, and have short haloed leaders to their representative water locations. Duplicate Tuckasegee names include a separate county line. Screen-space placement avoids other labels, pins, clusters, controls and map edges; selection gets first placement. At dense overview scales not every name can fit: omit colliding names rather than overlap, show an honest visible-name count, and invite zoom/filter for more. All schedule names remain available in the accessible list. Keep existing map dimensions; never enlarge the map just to force all 33 labels in. Labels are hidden during pan/zoom and laid out again afterward, including resize/filter/reset.

Navigation: the entire masthead icon/title is one native keyboard-focusable home link to `/nc-trout-stocking/`. Normal navigation deliberately discards filters, selection and URL fragments. The legend uses `#` for an example November stocking day, never a misleading fixed date.

Feedback: result count is an aria-live status; no results offers a filter reset. Data errors are explicit; map tiles can fail independently. Selection must remain visible and focus stays on the triggering list control.
