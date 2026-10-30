// Map / Satellite base layers. Both keep the same map zoom range so switching
// never moves the view; imagery past its last cached level is enlarged and the
// page says so (see basemapNote). Provider decision is recorded in README.md.
export const IMAGERY_DETAIL_ZOOM = 16;

export const BASEMAPS = {
  map: {
    label: "Map",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  satellite: {
    label: "Satellite",
    // USGS The National Map orthoimagery: public domain, no key or account.
    url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 19,
      maxNativeZoom: IMAGERY_DETAIL_ZOOM,
      attribution:
        'Imagery: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>, USDA NAIP',
    },
  },
};

export function isBasemap(choice) {
  return Object.hasOwn(BASEMAPS, choice);
}

// Caveat shown under the map while imagery is active, or "" for the road map.
export function basemapNote(choice, zoom) {
  if (choice !== "satellite") return "";
  const note =
    "Aerial imagery (USDA NAIP via USGS; service updated June 2024, photo dates vary) is not live and does not show public access, closures or current conditions.";
  return zoom > IMAGERY_DETAIL_ZOOM
    ? `${note} Imagery is enlarged past its full detail at this zoom; zoom out for a sharper view.`
    : note;
}

export function tileWarning(choice) {
  return choice === "satellite"
    ? "Some satellite imagery could not load. Water outlines, date pins and the full schedule are still available."
    : "Some basemap tiles could not load. Water outlines and the full schedule are still available.";
}
