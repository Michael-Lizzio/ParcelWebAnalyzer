// static/js/requirements/ui.js

import {
  amenityEmoji,
  prettyAmenityName
} from "./constants.js";
import {
  resetRequirementsModel,
  loadRequirementsForRun,
  buildAmenityCountsFromGeojson,
  setAmenityCounts,
  getRequirements,
  getShowAllAmenities,
  setShowAllAmenities,
  toggleRequirementActive,
  moveRequirement,
  deleteRequirement,
  getRequirementAmenities,
  deriveDefaultLabel
} from "./model.js";
import { initRequirementModals, openAmenitySelectModal, openConfigureModal } from "./modals.js";
import { updateAmenitiesStyling, showScoredParcels, clearScoredParcels } from "../map.js";
import { scoreSelection, downloadParcels } from "../api.js";
import { state } from "../state.js";

let sidebarEl = null;
let sidebarToggleBtn = null;
let reqListEl = null;
let reqEmptyEl = null;
let btnAddReq = null;

let legendItemsEl = null;
let chkShowAllEl = null;

// applied requirement colors
const COLOR_PALETTE = [
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#0ea5e9",
  "#84cc16"
];

// ---------- public entrypoints ----------

export function initRequirementsUI() {
  sidebarEl = document.getElementById("sidebar");
  sidebarToggleBtn = document.getElementById("sidebar-toggle");
  reqListEl = document.getElementById("requirements-list");
  reqEmptyEl = document.getElementById("requirements-empty");
  btnAddReq = document.getElementById("btn-add-requirement");

  legendItemsEl = document.getElementById("amenity-legend-items");
  chkShowAllEl = document.getElementById("chk-show-all");

  // sidebar toggle
  sidebarToggleBtn.addEventListener("click", () => {
    if (sidebarEl.classList.contains("sidebar--collapsed")) {
      sidebarEl.classList.remove("sidebar--collapsed");
    } else {
      sidebarEl.classList.add("sidebar--collapsed");
    }
  });

  // show-all checkbox
  chkShowAllEl.checked = getShowAllAmenities();
  chkShowAllEl.addEventListener("change", () => {
    setShowAllAmenities(!!chkShowAllEl.checked);
    updateLegendAndMapColors();
  });

  // add requirement button
  btnAddReq.addEventListener("click", () => {
    openAmenitySelectModal();
  });

  // process requirements button
  const btnProcessReqs = document.getElementById("btn-process-requirements");
  if (btnProcessReqs) {
    btnProcessReqs.addEventListener("click", async () => {
      await processRequirements();
    });
  }

  // download buttons
  const btnDownloadGeoJSON = document.getElementById("btn-download-geojson");
  if (btnDownloadGeoJSON) {
    btnDownloadGeoJSON.addEventListener("click", async () => {
      await downloadScoredParcels("geojson");
    });
  }

  const btnDownloadShapefile = document.getElementById("btn-download-shapefile");
  if (btnDownloadShapefile) {
    btnDownloadShapefile.addEventListener("click", async () => {
      await downloadScoredParcels("shapefile");
    });
  }

  // modals, with callback when requirements change
  initRequirementModals({
    onChange: () => {
      renderRequirementsList();
      updateLegendAndMapColors();
      updateProcessStatus();
    }
  });

  hideSidebar();
  renderRequirementsList();
  updateLegendAndMapColors();
}

export function requirementsReset() {
  resetRequirementsModel();
  hideSidebar();
  renderRequirementsList();
  updateLegendAndMapColors();
}

export async function requirementsOnAnalysisReady(runId, amenitiesGeojson) {
  await loadRequirementsForRun(runId);

  const counts = buildAmenityCountsFromGeojson(amenitiesGeojson);
  setAmenityCounts(counts);

  showSidebar();
  renderRequirementsList();
  updateLegendAndMapColors();
}

// ---------- sidebar visibility ----------

function showSidebar() {
  sidebarEl.classList.remove("sidebar--hidden");
  sidebarEl.classList.remove("sidebar--collapsed");
}

function hideSidebar() {
  sidebarEl.classList.add("sidebar--hidden");
}

// ---------- list rendering ----------

function renderRequirementsList() {
  const requirements = getRequirements();

  if (!requirements.length) {
    reqEmptyEl.style.display = "block";
  } else {
    reqEmptyEl.style.display = "none";
  }

  reqListEl.innerHTML = "";

  for (let i = 0; i < requirements.length; i++) {
    const r = requirements[i];
    const amenities = getRequirementAmenities(r);
    const label = r.label || deriveDefaultLabel(amenities);

    const card = document.createElement("div");
    card.className = "req-card";

    const top = document.createElement("div");
    top.className = "req-card__top";

    const em = document.createElement("div");
    em.className = "req-card__emoji";
    em.textContent = amenities.length
      ? amenityEmoji(amenities[0])
      : "•";

    const name = document.createElement("div");
    name.className = "req-card__name";
    name.textContent = label;

    top.appendChild(em);
    top.appendChild(name);

    const orderLine = document.createElement("div");
    orderLine.className = "req-card__order";

    const typeText =
      amenities.length === 1
        ? prettyAmenityName(amenities[0])
        : `${amenities.length} amenity types`;
    orderLine.textContent = `Priority #${r.id} • ${typeText}`;

    const meta = document.createElement("div");
    meta.className = "req-card__meta";
    meta.textContent = describeRequirement(r);

    const reorderRow = document.createElement("div");
    reorderRow.className = "req-card__reorder";

    const btnUp = document.createElement("button");
    btnUp.textContent = "↑";
    btnUp.title = "Move up";
    btnUp.addEventListener("click", async () => {
      await moveRequirement(r.id, -1);
      renderRequirementsList();
      updateLegendAndMapColors();
    });

    const btnDown = document.createElement("button");
    btnDown.textContent = "↓";
    btnDown.title = "Move down";
    btnDown.addEventListener("click", async () => {
      await moveRequirement(r.id, +1);
      renderRequirementsList();
      updateLegendAndMapColors();
    });

    reorderRow.appendChild(btnUp);
    reorderRow.appendChild(btnDown);

    const actions = document.createElement("div");
    actions.className = "req-card__actions";

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Edit";
    btnEdit.className = "btn-secondary";
    btnEdit.addEventListener("click", () => {
      openConfigureModal(r.id);
    });

    const btnToggle = document.createElement("button");
    btnToggle.textContent = r.active ? "Un-Apply" : "Apply";
    btnToggle.addEventListener("click", async () => {
      await toggleRequirementActive(r.id);
      renderRequirementsList();
      updateLegendAndMapColors();
    });

    actions.appendChild(btnEdit);
    actions.appendChild(btnToggle);

    card.appendChild(top);
    card.appendChild(orderLine);
    card.appendChild(meta);
    card.appendChild(reorderRow);
    card.appendChild(actions);

    reqListEl.appendChild(card);
  }
}

function describeRequirement(r) {
  const op = r.operator === "not_within" ? "NOT within" : "within";
  const miles = Number(r.miles).toFixed(2);
  const modeName = r.mode ? r.mode : "walk";
  const minutes = Number(r.minutes).toFixed(0);
  return `${op} ${miles} mi (${minutes} min ${modeName})`;
}

// ---------- legend + map styling ----------

function updateLegendAndMapColors() {
  const requirements = getRequirements();
  const showAll = getShowAllAmenities();

  // applied requirements
  const applied = [];
  for (let i = 0; i < requirements.length; i++) {
    const r = requirements[i];
    if (!r.active) continue;
    const color = COLOR_PALETTE[i % COLOR_PALETTE.length];
    const amenities = getRequirementAmenities(r);
    if (!amenities.length) continue;

    applied.push({
      color,
      label: r.label || deriveDefaultLabel(amenities),
      amenities
    });
  }

  // legend DOM
  legendItemsEl.innerHTML = "";
  for (let i = 0; i < applied.length; i++) {
    const { color, label } = applied[i];

    const row = document.createElement("div");
    row.className = "legend-item";

    const sw = document.createElement("div");
    sw.className = "legend-swatch";
    sw.style.backgroundColor = color;

    const lbl = document.createElement("div");
    lbl.textContent = label;

    row.appendChild(sw);
    row.appendChild(lbl);
    legendItemsEl.appendChild(row);
  }

  // amenity -> color mapping for map
  const amenityColorEntries = [];
  for (let i = 0; i < applied.length; i++) {
    const { color, amenities } = applied[i];
    for (let j = 0; j < amenities.length; j++) {
      amenityColorEntries.push({ amenity: amenities[j], color });
    }
  }

  updateAmenitiesStyling(amenityColorEntries, showAll);
}

// ---------- process requirements and scoring ----------

async function processRequirements() {
  const requirements = getRequirements();
  const activeReqs = requirements.filter(r => r.active);

  if (activeReqs.length === 0) {
    alert("No active requirements to process");
    return;
  }

  if (!state.lastParcelsGeojson || !state.lastAmenitiesGeojson) {
    alert("No parcels or amenities loaded. Run analysis first.");
    return;
  }

  const statusEl = document.getElementById("status");
  const btnProcessReqs = document.getElementById("btn-process-requirements");

  try {
    statusEl.textContent = "Processing requirements...";
    btnProcessReqs.disabled = true;

    // Call scoring API
    const result = await scoreSelection(
      state.runId,
      activeReqs,
      state.lastParcelsGeojson,
      state.lastAmenitiesGeojson
    );

    // Store results in state
    state.scoredParcelsPoints = result.parcels_scored_points;
    state.scoredParcelsPolygons = result.parcels_scored_polygons;
    state.scoreWeights = result.weights;
    state.countsFields = result.counts_fields;
    state.lastScoredHash = state.requirementsHash;

    // Render scored parcels on map
    clearScoredParcels();
    showScoredParcels(
      state.scoredParcelsPolygons,
      state.scoredParcelsPoints
    );

    statusEl.textContent = `Scored ${result.parcels_scored_polygons.features.length} parcels.`;
    updateProcessStatus();

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error processing requirements.";
  } finally {
    btnProcessReqs.disabled = false;
  }
}

async function downloadScoredParcels(format) {
  if (!state.scoredParcelsPolygons) {
    alert("No scored parcels to download. Process requirements first.");
    return;
  }

  const statusEl = document.getElementById("status");
  try {
    statusEl.textContent = `Downloading ${format}...`;
    await downloadParcels(state.runId, state.scoredParcelsPolygons, format);
    statusEl.textContent = `Download complete.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Download failed: ${err.message}`;
  }
}

function computeRequirementsHash() {
  const requirements = getRequirements();
  const activeReqs = requirements.filter(r => r.active);
  // Simple hash: JSON stringify the relevant fields
  const hashInput = JSON.stringify(
    activeReqs.map(r => ({
      id: r.id,
      amenities: r.amenities,
      miles: r.miles,
      operator: r.operator
    }))
  );
  return hashInput;
}

function updateProcessStatus() {
  const processStatusEl = document.getElementById("process-status");
  if (!processStatusEl) return;

  const currentHash = computeRequirementsHash();
  state.requirementsHash = currentHash;

  if (state.lastScoredHash === null) {
    processStatusEl.textContent = "Not processed";
    processStatusEl.className = "process-status status-none";
  } else if (currentHash === state.lastScoredHash) {
    processStatusEl.textContent = "Up to date";
    processStatusEl.className = "process-status status-current";
  } else {
    processStatusEl.textContent = "Outdated";
    processStatusEl.className = "process-status status-outdated";
  }
}
