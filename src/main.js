import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./style.css";
import { validateGuide } from "./guide-model.js";
import { renderGuide, renderGuideDisclosure } from "./guide-view.js";
import {
  filterWaters,
  sortWaters,
  dateLabel,
  readState,
  stateUrl,
} from "./model.js";

const $ = (selector) => document.querySelector(selector);
const base = import.meta.env.BASE_URL;
const state = readState(location.search);
const controls = { query: $("#query"), county: $("#county"), date: $("#date") };
const map = L.map("map", {
  scrollWheelZoom: false,
  zoomControl: true,
  // Keep cluster zoom cleanup from removing focused markers after filter changes.
  zoomAnimation: false,
}).setView(
  [35.8, -82.2],
  7,
);
const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
tiles.on("tileerror", () => {
  $("#tile-warning").hidden = false;
});
const sectionGroup = L.featureGroup().addTo(map);
const markerGroup = L.markerClusterGroup({
  maxClusterRadius: 50,
  disableClusteringAtZoom: 12,
  showCoverageOnHover: false,
  animate: false,
  spiderfyOnMaxZoom: true,
  iconCreateFunction: (cluster) =>
    L.divIcon({
      className: "water-cluster",
      html: `<strong>${cluster.getChildCount()}</strong><span>waters</span>`,
      iconSize: [46, 46],
    }),
}).addTo(map);
markerGroup.on("clusterclick", (event) =>
  event.layer.zoomToBounds({ padding: [40, 40] }),
);
let waters = [],
  guide,
  guideEntries,
  guideSources,
  sections,
  visible = [],
  selected = "";
const layers = new Map(),
  markers = new Map();

// Screen-space names are independent of marker clustering. Pins stay at their
// representative coordinates; only labels move, with leaders back to the water.
const nameOverlay = node("div", "map-water-names");
nameOverlay.setAttribute("aria-hidden", "true");
const nameLeaders = document.createElementNS("http://www.w3.org/2000/svg", "svg");
nameLeaders.classList.add("map-name-leaders");
nameOverlay.append(nameLeaders);
const namePane = map.createPane("waterNames");
namePane.style.zIndex = 550; // Below date pins/clusters (600), above sections (400).
namePane.style.pointerEvents = "none";
namePane.append(nameOverlay);
let nameFrame;
function scheduleNames() {
  cancelAnimationFrame(nameFrame);
  nameFrame = requestAnimationFrame(layoutNames);
}
map.on("moveend zoomend resize", scheduleNames);
map.on("movestart zoomstart", () => { nameOverlay.hidden = true; });

function layoutNames() {
  nameOverlay.hidden = false;
  nameOverlay.querySelectorAll(".map-water-label").forEach((label) => label.remove());
  nameLeaders.replaceChildren();
  const size = map.getSize();
  const origin = map.containerPointToLayerPoint([0, 0]);
  Object.assign(nameOverlay.style, {
    left: `${origin.x}px`, top: `${origin.y}px`, width: `${size.x}px`, height: `${size.y}px`,
  });
  const mapRect = map.getContainer().getBoundingClientRect();
  const overlaps = (a, b) => a.left < b.right + 3 && a.right > b.left - 3
    && a.top < b.bottom + 3 && a.bottom > b.top - 3;
  // Keep labels off date pins, count circles, zoom controls and attribution.
  const occupied = [...map.getContainer().querySelectorAll(
    ".date-marker, .water-cluster, .leaflet-control",
  )].map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left - mapRect.left, right: rect.right - mapRect.left,
      top: rect.top - mapRect.top, bottom: rect.bottom - mapRect.top };
  });
  let shown = 0;
  const items = [...visible].sort((a, b) =>
    Number(b.id === selected) - Number(a.id === selected) || a.name.localeCompare(b.name));
  for (const water of items) {
    const point = map.latLngToContainerPoint([water.lat, water.lng]);
    if (point.x < 0 || point.x > size.x || point.y < 0 || point.y > size.y) continue;
    const duplicate = waters.some((other) => other.id !== water.id && other.name === water.name);
    const label = node("div", "map-water-label", water.name);
    if (duplicate) label.append(node("span", "map-label-county", ` · ${water.county} County`));
    label.dataset.waterId = water.id;
    label.classList.toggle("is-selected", water.id === selected);
    nameOverlay.append(label);
    const width = label.offsetWidth, height = label.offsetHeight;
    let placement;
    // Prefer nearby placements; a bounded search prevents misleading long leaders.
    for (const radius of [22, 38, 56]) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        const left = Math.max(8, Math.min(size.x - width - 8,
          point.x + dx * radius - (dx < 0 ? width : dx === 0 ? width / 2 : 0)));
        const top = Math.max(8, Math.min(size.y - height - 8,
          point.y + dy * radius - (dy < 0 ? height : dy === 0 ? height / 2 : 0)));
        const box = { left, top, right: left + width, bottom: top + height };
        if (!occupied.some((other) => overlaps(box, other))) {
          placement = box;
          break;
        }
      }
      if (placement) break;
    }
    if (!placement) { label.hidden = true; continue; }
    occupied.push(placement);
    label.style.left = `${placement.left}px`;
    label.style.top = `${placement.top}px`;
    const leader = document.createElementNS("http://www.w3.org/2000/svg", "line");
    leader.setAttribute("x1", point.x);
    leader.setAttribute("y1", point.y);
    leader.setAttribute("x2", Math.max(placement.left, Math.min(point.x, placement.right)));
    leader.setAttribute("y2", Math.max(placement.top, Math.min(point.y, placement.bottom)));
    const halo = leader.cloneNode();
    halo.classList.add("leader-halo");
    const anchor = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    anchor.setAttribute("cx", point.x);
    anchor.setAttribute("cy", point.y);
    anchor.setAttribute("r", 2.5);
    nameLeaders.append(halo, leader, anchor);
    shown++;
  }
  $("#label-hint").textContent = visible.length
    ? `${shown} of ${visible.length} names shown. Zoom or filter to make room for more.`
    : "No water names to show.";
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function link(text, href) {
  const element = node("a", "", text);
  element.href = href;
  element.target = "_blank";
  element.rel = "noopener noreferrer";
  return element;
}

function saveUrl() {
  history.replaceState(
    null,
    "",
    stateUrl(new URL(location.href), { ...state, water: selected }),
  );
}

function markerIcon(water, active = false) {
  return L.divIcon({
    className: `date-marker${active ? " selected" : ""}`,
    html: String(Number(water.date.slice(-2))),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function selectWater(id, zoom = true) {
  const water = visible.find((w) => w.id === id);
  if (!water) return;
  selected = id;
  for (const [waterId, layer] of layers)
    layer.setStyle({
      color: waterId === id ? "#a53d20" : "#193f38",
      weight: waterId === id ? 6 : 4,
      opacity: waterId === id ? 1 : 0.8,
    });
  for (const [waterId, marker] of markers) {
    const item = waters.find((w) => w.id === waterId);
    marker.setIcon(markerIcon(item, waterId === id));
    marker.setZIndexOffset(waterId === id ? 1000 : 0);
    labelMarker(marker, item);
  }
  document.querySelectorAll(".water-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.id === id));
  });
  const detail = $("#detail");
  const heading = node("h3", "", water.name);
  const links = node("div", "detail-links");
  links.append(
    link(
      "Official schedule ↗",
      "https://www.ncwildlife.gov/delayed-harvest-schedule",
    ),
    link(
      "Official trout map ↗",
      "https://www.ncpaws.org/ncwrcmaps/fishingareas",
    ),
  );
  detail.replaceChildren(
    node("p", "eyebrow", `${water.county} County · Delayed harvest`),
    heading,
    node("p", "stock-date", `Scheduled: ${dateLabel(water.date)}`),
    node("p", "section-description", water.section),
    node(
      "p",
      "location-note",
      "Representative location on the mapped water. Not an exact release point, parking location, or guarantee of public access.",
    ),
    links,
    renderGuide(guideEntries.get(id), guideSources, water, guide.researched),
  );
  if (water.scopeNote)
    detail.append(node("p", "location-note", water.scopeNote));
  if (zoom) {
    const layer = layers.get(id);
    if (layer?.getBounds().isValid())
      map.fitBounds(layer.getBounds(), {
        padding: [45, 45],
        maxZoom: 14,
        animate: false,
      });
    else map.setView([water.lat, water.lng], 14, { animate: false });
  }
  scheduleNames();
  saveUrl();
}

function labelMarker(marker, water) {
  const element = marker.getElement();
  if (element) {
    element.setAttribute("role", "button");
    element.setAttribute(
      "aria-label",
      `${water.name}, ${water.county} County, scheduled ${dateLabel(water.date)}`,
    );
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        selectWater(water.id);
        marker.getElement()?.focus({ preventScroll: true });
      }
    };
  }
}

function renderList() {
  const fragment = document.createDocumentFragment();
  for (const water of visible) {
    const li = node("li");
    li.dataset.waterId = water.id;
    const button = node("button", "water-button");
    button.type = "button";
    button.dataset.id = water.id;
    button.setAttribute("aria-pressed", String(water.id === selected));
    button.setAttribute(
      "aria-label",
      `${water.name}, ${water.county} County, ${dateLabel(water.date)}. Show on map`,
    );
    const stamp = node("span", "date-stamp");
    stamp.setAttribute("aria-hidden", "true");
    stamp.append(
      node("small", "", "NOV"),
      node("strong", "", Number(water.date.slice(-2))),
    );
    const label = node("span", "water-label");
    label.append(
      node("strong", "", water.name),
      node(
        "span",
        "",
        `${water.county} County · ${dateLabel(water.date).split(",")[0]}`,
      ),
    );
    const arrow = node("span", "row-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    button.append(stamp, label, arrow);
    button.addEventListener("click", () => {
      selectWater(water.id);
      if (matchMedia("(max-width: 767px)").matches)
        $("#detail").scrollIntoView({ block: "center", behavior: "instant" });
    });
    li.append(button, renderGuideDisclosure(guideEntries.get(water.id), guideSources, water, guide.researched, dateLabel(water.date)));
    fragment.append(li);
  }
  $("#water-list").replaceChildren(fragment);
  $("#count").textContent = `${visible.length} of ${waters.length} waters`;
  $("#empty").hidden = visible.length > 0;
}

function fitResults() {
  const bounds = sectionGroup.getBounds().extend(markerGroup.getBounds());
  if (bounds.isValid())
    map.fitBounds(bounds, {
      padding: [35, 35],
      maxZoom: visible.length === 1 ? 13 : 11,
      animate: false,
    });
}

function renderMap() {
  sectionGroup.clearLayers();
  markerGroup.clearLayers();
  layers.clear();
  markers.clear();
  for (const water of visible) {
    const features = sections.features.filter(
      (f) => f.properties.waterId === water.id,
    );
    const layer = L.geoJSON(
      { type: "FeatureCollection", features },
      { style: { color: "#193f38", weight: 4, opacity: 0.8 } },
    );
    layer.on("click", () => selectWater(water.id));
    layer.addTo(sectionGroup);
    layers.set(water.id, layer);
    const marker = L.marker([water.lat, water.lng], {
      icon: markerIcon(water),
      title: `${water.name} · ${water.county} · Nov ${Number(water.date.slice(-2))}`,
      keyboard: true,
    });
    marker.on("click", () => selectWater(water.id));
    marker.on("add", () => labelMarker(marker, water));
    marker.addTo(markerGroup);
    markers.set(water.id, marker);
    labelMarker(marker, water);
  }
  scheduleNames();
}

function applyFilters(fit = true) {
  visible = sortWaters(filterWaters(waters, state));
  if (!visible.some((w) => w.id === selected)) {
    selected = "";
    $("#detail").replaceChildren(
      node("p", "eyebrow", "A little closer to the water"),
      node(
        "h3",
        "",
        visible.length
          ? "Choose a water to see more"
          : "No waters match your filters",
      ),
      node(
        "p",
        "",
        visible.length
          ? "Click a date pin, a river section, or a water in the schedule."
          : "Reset filters to explore the full schedule.",
      ),
    );
  }
  renderList();
  renderMap();
  if (selected) selectWater(selected, false);
  if (fit) fitResults();
  saveUrl();
}

function resetFilters() {
  for (const key of Object.keys(controls)) {
    state[key] = "";
    controls[key].value = "";
  }
  selected = "";
  applyFilters();
}

async function start() {
  try {
    const responses = await Promise.all(
      ["waters.json", "sections.geojson", "angler-guide.json"].map((path) =>
        fetch(`${base}data/${path}`),
      ),
    );
    if (responses.some((response) => !response.ok))
      throw new Error("Local map data is unavailable");
    [waters, sections, guide] = await Promise.all(
      responses.map((response) => response.json()),
    );
    if (waters.length !== 33 || !sections.features?.length)
      throw new Error("Incomplete map data");
    validateGuide(guide, waters);
    guideEntries = new Map(guide.entries.map(entry => [entry.id, entry]));
    guideSources = new Map(guide.sources.map(source => [source.id, source]));
    const counties = [...new Set(waters.map((w) => w.county))].sort();
    const dates = [...new Set(waters.map((w) => w.date))].sort();
    $(".edition span").textContent =
      `${waters.length} waters · ${counties.length} counties`;
    for (const county of counties)
      controls.county.add(new Option(county, county));
    for (const date of dates)
      controls.date.add(
        new Option(dateLabel(date).replace(", 2026", ""), date),
      );
    function normalizeFilters() {
      if (!counties.includes(state.county)) state.county = "";
      if (!dates.includes(state.date)) state.date = "";
    }
    normalizeFilters();
    for (const [key, control] of Object.entries(controls)) {
      control.value = state[key];
      control.addEventListener(key === "query" ? "input" : "change", () => {
        state[key] = control.value;
        applyFilters();
      });
    }
    selected = state.water;
    applyFilters();
    if (selected) selectWater(selected);
    $("#filters").addEventListener("submit", (event) => event.preventDefault());
    $("#reset").addEventListener("click", resetFilters);
    $("#empty-reset").addEventListener("click", () => {
      resetFilters();
      controls.query.focus();
    });
    $("#fit").addEventListener("click", fitResults);
    addEventListener("popstate", () => {
      Object.assign(state, readState(location.search));
      normalizeFilters();
      selected = state.water;
      for (const [key, control] of Object.entries(controls))
        control.value = state[key];
      applyFilters();
      if (selected) selectWater(selected);
    });
  } catch (error) {
    $("#load-error").hidden = false;
    $("#count").textContent = "Data unavailable";
    console.error(error);
  }
}
start();
