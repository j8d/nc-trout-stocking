import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./style.css";
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
const map = L.map("map", { scrollWheelZoom: false, zoomControl: true }).setView(
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
  maxClusterRadius: 32,
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
  sections,
  visible = [],
  selected = "";
const layers = new Map(),
  markers = new Map();

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
    li.append(button);
    fragment.append(li);
  }
  $("#water-list").replaceChildren(fragment);
  $("#count").textContent = `${visible.length} of ${waters.length} waters`;
  $("#empty").hidden = visible.length > 0;
}

function fitResults() {
  const bounds = markerGroup.getBounds();
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
      ["waters.json", "sections.geojson"].map((path) =>
        fetch(`${base}data/${path}`),
      ),
    );
    if (responses.some((response) => !response.ok))
      throw new Error("Local map data is unavailable");
    [waters, sections] = await Promise.all(
      responses.map((response) => response.json()),
    );
    if (waters.length !== 33 || !sections.features?.length)
      throw new Error("Incomplete map data");
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
    if (!counties.includes(state.county)) state.county = "";
    if (!dates.includes(state.date)) state.date = "";
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
    $("#empty-reset").addEventListener("click", resetFilters);
    $("#fit").addEventListener("click", fitResults);
    addEventListener("popstate", () => {
      Object.assign(state, readState(location.search));
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
