# Design: a practical mountain-water field guide

## Angler-guide extension (J8D-35)

Audience/task: compare the November 2026 schedule, then read a water's setting, access cautions and trip-planning advice before choosing it. Success: all 33 county/water entries have their own discoverable guide; selecting a map pin exposes the same copy without losing schedule scanning or map controls.

This small extension reuses established list/detail patterns and tokens, so a separate prototype/design phase is waived. Keep each existing date/name/map button; add a sibling native `details` disclosure labeled “Angler guide”, with a water/county-specific accessible name. The expanded body shows the official designation/section, date, approved summary and public “Trip-planning note”, research date and per-water source links. Do not nest interactive controls in the map button or disclosure summary. Selected-water detail repeats the guide openly. Keep private editorial material out of the source/public data, not merely hidden.

Use existing pine links, paper surfaces, muted metadata and spacing; add no new visual vocabulary. Native disclosure targets are at least 44px high; numbered citations have accessible source names and inline hit areas, with a readable source list for touch users. Long titles/URLs wrap inside the sidebar. Shared trip context belongs in the existing “Before you head out” notes with a nearby guide reminder. Verify expanded content at 320/768/1024/1440px, keyboard disclosure/source/selection journeys (including delayed map cleanup), and axe on expanded content.


Primary task: find a water near a chosen county or on a stocking date; inspect its designated section without mistaking the marker for an access or release point.

Map-first on desktop (date-sorted 360px sidebar + large map); map and list stacked on mobile. Filters are native, visibly labeled controls. Full list is the accessible alternative to map geometry. Selecting a list entry opens the same map detail; no modal or navigation trap. Minimal motion, no hero banner taking the map off screen.

Visual vocabulary: warm paper (#f6f4ee), deep pine (#193f38), dark ink (#1c302c), rust accent (#a53d20), subdued borders (#d6dcd4). System sans body, Georgia display title. Small uppercase labels; bold tabular stocking-date stamps. Dates printed on markers so meaning never relies on color. Border radii 6–10px, 4px spacing scale, controls at least 44px high. Focus outline is high-contrast rust, not a subtle color change.

Map semantics: solid pine strokes for official delayed-harvest sections, rust for selection; representative date markers along those sections. Explain them directly above the map. Never label a marker as an exact stocking point. Always retain attribution. Basemap failure leaves local section outlines and complete list available.

Water names: a default-on, noninteractive label pane sits above sections and below date pins/clusters. Names use DOM text, remain independent of clustering, and have short haloed leaders to their representative water locations. Duplicate Tuckasegee names include a separate county line. Screen-space placement avoids other labels, pins, clusters, controls and map edges; selection gets first placement. At dense overview scales not every name can fit: omit colliding names rather than overlap, show an honest visible-name count, and invite zoom/filter for more. All schedule names remain available in the accessible list. Keep existing map dimensions; never enlarge the map just to force all 33 labels in. Labels are hidden during pan/zoom and laid out again afterward, including resize/filter/reset.

Navigation: the entire masthead icon/title is one native keyboard-focusable home link to `/nc-trout-stocking/`. Normal navigation deliberately discards filters, selection and URL fragments. The legend uses `#` for an example November stocking day, never a misleading fixed date.

Feedback: result count is an aria-live status; no results offers a filter reset. Data errors are explicit; map tiles can fail independently. Selection must remain visible and focus stays on the triggering list control.
