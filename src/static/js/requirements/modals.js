// static/js/requirements/modals.js

import {
  MODE_SPEEDS_MPH,
  amenityEmoji,
  prettyAmenityName
} from "./constants.js";
import {
  getRequirements,
  getAmenityCounts,
  getUsedAmenitiesSet,
  getRequirementAmenities,
  deriveDefaultLabel,
  saveRequirement,
  deleteRequirement as modelDeleteRequirement
} from "./model.js";

let modalBackdrop = null;
let modalContent = null;
let modalTitle = null;
let modalCloseBtn = null;

let onChangeCallback = null;

// ---------- init ----------

export function initRequirementModals({ onChange }) {
  onChangeCallback = onChange || null;

  modalBackdrop = document.getElementById("modal-backdrop");
  modalContent = document.getElementById("modal-content");
  modalTitle = document.getElementById("modal-title");
  modalCloseBtn = document.getElementById("modal-close");

  modalCloseBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modalBackdrop.classList.contains("hidden")) closeModal();
    }
  });
}

// ---------- modal helpers ----------

function openModal(titleText) {
  modalTitle.textContent = titleText;
  modalContent.innerHTML = "";
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalContent.innerHTML = "";
}

function fireChange() {
  if (onChangeCallback) onChangeCallback();
}

// ---------- public API ----------

export function openAmenitySelectModal() {
  const amenityCounts = getAmenityCounts();
  if (!amenityCounts || !Object.keys(amenityCounts).length) return;

  openModal("Add Requirement — Select Amenity");

  const used = getUsedAmenitiesSet();

  const types = Object.keys(amenityCounts);
  types.sort((a, b) => amenityCounts[b] - amenityCounts[a]);

  const title = document.createElement("div");
  title.className = "modal-step-title";
  title.textContent =
    "Select one or more amenities to group, then click Next:";

  const list = document.createElement("div");
  list.className = "amenity-list";

  const selected = new Set();
  let anyRows = false;

  const btnNext = document.createElement("button");
  btnNext.textContent = "Next";
  btnNext.disabled = true;

  for (let i = 0; i < types.length; i++) {
    const amenity = types[i];
    if (used.has(amenity)) continue;
    anyRows = true;

    const row = document.createElement("div");
    row.className = "amenity-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.marginRight = "0.4rem";

    const em = document.createElement("div");
    em.className = "amenity-row__emoji";
    em.textContent = amenityEmoji(amenity);

    const nm = document.createElement("div");
    nm.className = "amenity-row__name";
    nm.textContent = prettyAmenityName(amenity);

    const ct = document.createElement("div");
    ct.className = "amenity-row__count";
    ct.textContent = String(amenityCounts[amenity]);

    const clickToggle = () => {
      if (selected.has(amenity)) {
        selected.delete(amenity);
        checkbox.checked = false;
      } else {
        selected.add(amenity);
        checkbox.checked = true;
      }
      btnNext.disabled = selected.size === 0;
    };

    row.addEventListener("click", (e) => {
      if (e.target === checkbox) return;
      clickToggle();
    });
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      clickToggle();
    });

    row.appendChild(checkbox);
    row.appendChild(em);
    row.appendChild(nm);
    row.appendChild(ct);
    list.appendChild(row);
  }

  modalContent.appendChild(title);

  if (!anyRows) {
    const none = document.createElement("div");
    none.className = "muted";
    none.textContent =
      "No more amenities to add (all types already used in requirements).";
    modalContent.appendChild(none);
  } else {
    modalContent.appendChild(list);
  }

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const btnCancel = document.createElement("button");
  btnCancel.className = "btn-secondary";
  btnCancel.textContent = "Cancel";
  btnCancel.addEventListener("click", closeModal);

  btnNext.addEventListener("click", () => {
    const amenities = Array.from(selected);
    if (!amenities.length) return;
    openConfigureModal(null, amenities);
  });

  actions.appendChild(btnCancel);
  actions.appendChild(btnNext);
  modalContent.appendChild(actions);
}

export function openConfigureModal(id, amenitiesForNew = null) {
  const allReqs = getRequirements();
  let editing = null;
  if (id != null) {
    editing = allReqs.find((r) => r.id === id) || null;
  }

  const amenities = editing
    ? getRequirementAmenities(editing)
    : Array.isArray(amenitiesForNew)
    ? amenitiesForNew
    : [];

  openModal(editing ? "Edit Requirement" : "Add Requirement — Configure");

  const header = document.createElement("div");
  header.className = "modal-step-title";

  if (amenities.length === 1) {
    header.textContent = `Amenity: ${amenityEmoji(
      amenities[0]
    )} ${prettyAmenityName(amenities[0])}`;
  } else {
    header.textContent = `Amenity group (${amenities.length} types)`;
  }
  modalContent.appendChild(header);

  if (amenities.length > 1) {
    const list = document.createElement("div");
    list.className = "muted";
    list.style.marginBottom = "0.4rem";
    list.textContent = amenities
      .map((a) => prettyAmenityName(a))
      .join(", ");
    modalContent.appendChild(list);
  }

  // Label
  const labelRow = document.createElement("div");
  labelRow.className = "form-row";

  const labelLabel = document.createElement("label");
  labelLabel.textContent = "Label (for sidebar & legend)";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder =
    amenities.length > 1 ? "e.g., Food & Drink" : "e.g., Favorite cafes";

  if (editing && editing.label) {
    labelInput.value = editing.label;
  } else {
    labelInput.value = deriveDefaultLabel(amenities);
  }

  labelLabel.appendChild(labelInput);
  labelRow.appendChild(labelLabel);
  modalContent.appendChild(labelRow);

  // Operator
  const operatorRow = document.createElement("div");
  operatorRow.className = "form-row";
  const opLabel = document.createElement("label");
  opLabel.textContent = "Rule";

  const opSelect = document.createElement("select");
  const optWithin = document.createElement("option");
  optWithin.value = "within";
  optWithin.textContent = "Within";
  const optNot = document.createElement("option");
  optNot.value = "not_within";
  optNot.textContent = "Not-within";

  opSelect.appendChild(optWithin);
  opSelect.appendChild(optNot);
  opLabel.appendChild(opSelect);
  operatorRow.appendChild(opLabel);
  modalContent.appendChild(operatorRow);

  // Mode + minutes + miles
  const distRow = document.createElement("div");
  distRow.className = "form-row";

  const modeLabel = document.createElement("label");
  modeLabel.textContent = "Mode";

  const modeSelect = document.createElement("select");
  addModeOption(modeSelect, "walk", "Walk (3 mph)");
  addModeOption(modeSelect, "run", "Run (6 mph)");
  addModeOption(modeSelect, "bike", "Bike (12 mph)");
  addModeOption(modeSelect, "drive", "Drive (30 mph)");
  modeLabel.appendChild(modeSelect);

  const minLabel = document.createElement("label");
  minLabel.textContent = "Minutes";

  const minInput = document.createElement("input");
  minInput.type = "number";
  minInput.min = "0";
  minInput.step = "1";
  minLabel.appendChild(minInput);

  const milesLabel = document.createElement("label");
  milesLabel.textContent = "Miles";

  const milesInput = document.createElement("input");
  milesInput.type = "number";
  milesInput.min = "0";
  milesInput.step = "0.01";
  milesLabel.appendChild(milesInput);

  distRow.appendChild(modeLabel);
  distRow.appendChild(minLabel);
  distRow.appendChild(milesLabel);
  modalContent.appendChild(distRow);

  // initial values
  if (editing) {
    opSelect.value = editing.operator || "within";
    modeSelect.value = editing.mode || "walk";
    minInput.value = String(editing.minutes || 10);
    milesInput.value = String(editing.miles || 0.5);
  } else {
    opSelect.value = "within";
    modeSelect.value = "walk";
    minInput.value = "10";
    milesInput.value = "0.50";
  }

  // sync minutes/miles
  let syncing = false;
  function minutesToMiles() {
    const mode = modeSelect.value;
    const mph = MODE_SPEEDS_MPH[mode] || 3;
    const minutes = parseFloat(minInput.value || "0");
    const miles = mph * (minutes / 60.0);
    milesInput.value = miles.toFixed(2);
  }
  function milesToMinutes() {
    const mode = modeSelect.value;
    const mph = MODE_SPEEDS_MPH[mode] || 3;
    const miles = parseFloat(milesInput.value || "0");
    const minutes = mph > 0 ? (miles / mph) * 60.0 : 0;
    minInput.value = String(Math.round(minutes));
  }

  minInput.addEventListener("input", () => {
    if (syncing) return;
    syncing = true;
    minutesToMiles();
    syncing = false;
  });
  milesInput.addEventListener("input", () => {
    if (syncing) return;
    syncing = true;
    milesToMinutes();
    syncing = false;
  });
  modeSelect.addEventListener("change", () => {
    if (syncing) return;
    syncing = true;
    minutesToMiles();
    syncing = false;
  });

  // actions
  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const btnBack = document.createElement("button");
  btnBack.className = "btn-secondary";
  btnBack.textContent = editing ? "Cancel" : "Back";
  btnBack.addEventListener("click", () => {
    if (editing) {
      closeModal();
    } else {
      openAmenitySelectModal();
    }
  });
  actions.appendChild(btnBack);

  if (editing) {
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "Delete";
    btnDelete.className = "btn-danger";
    btnDelete.addEventListener("click", async () => {
      await modelDeleteRequirement(editing.id);
      fireChange();
      closeModal();
    });
    actions.appendChild(btnDelete);
  }

  const btnSave = document.createElement("button");
  btnSave.textContent = editing ? "Save" : "Add";
  btnSave.addEventListener("click", async () => {
    await saveRequirement({
      id: editing ? editing.id : null,
      amenities,
      label: labelInput.value,
      operator: opSelect.value,
      mode: modeSelect.value,
      minutes: minInput.value,
      miles: milesInput.value
    });
    fireChange();
    closeModal();
  });
  actions.appendChild(btnSave);

  modalContent.appendChild(actions);
}

function addModeOption(select, value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}
