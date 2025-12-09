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
import { updateAmenitiesStyling } from "../map.js";

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

  // modals, with callback when requirements change
  initRequirementModals({
    onChange: () => {
      renderRequirementsList();
      updateLegendAndMapColors();
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
