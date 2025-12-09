// static/js/requirements/model.js

import {
  loadLocal,
  saveBoth,
  loadFromBackendThenCache,
  getNextRequirementId
} from "./store.js";
import { MODE_SPEEDS_MPH, prettyAmenityName } from "./constants.js";

let runId = null;
let requirements = [];
let amenityCounts = {};
let showAllAmenities = true;

// ---------- basic getters/setters ----------

export function getRunId() {
  return runId;
}

export function getRequirements() {
  return requirements;
}

export function getAmenityCounts() {
  return amenityCounts;
}

export function setAmenityCounts(counts) {
  amenityCounts = counts || {};
}

export function getShowAllAmenities() {
  return showAllAmenities;
}

export function setShowAllAmenities(flag) {
  showAllAmenities = !!flag;
}

// ---------- requirement helpers ----------

export function getRequirementAmenities(r) {
  if (Array.isArray(r.amenities) && r.amenities.length > 0) {
    return r.amenities.slice();
  }
  if (r.amenity) {
    return [r.amenity];
  }
  return [];
}

export function deriveDefaultLabel(amenities) {
  if (!amenities || !amenities.length) return "Requirement";
  if (amenities.length === 1) {
    return prettyAmenityName(amenities[0]);
  }
  const first = prettyAmenityName(amenities[0]);
  return `${first} + ${amenities.length - 1} more`;
}

function renumber() {
  for (let i = 0; i < requirements.length; i++) {
    requirements[i].id = i + 1;
  }
}

async function persist() {
  if (!runId) return;
  await saveBoth(runId, requirements);
}

export function resetRequirementsModel() {
  runId = null;
  requirements = [];
  amenityCounts = {};
  showAllAmenities = true;
}

// ---------- amenity counts ----------

export function buildAmenityCountsFromGeojson(geojson) {
  const counts = {};
  if (!geojson || !geojson.features) return counts;

  for (let i = 0; i < geojson.features.length; i++) {
    const f = geojson.features[i];
    const props = f && f.properties ? f.properties : null;
    const a = props ? props.amenity : null;
    if (!a) continue;
    if (counts[a] === undefined) counts[a] = 1;
    else counts[a] = counts[a] + 1;
  }
  return counts;
}

export function getUsedAmenitiesSet() {
  const used = new Set();
  for (let i = 0; i < requirements.length; i++) {
    const ams = getRequirementAmenities(requirements[i]);
    for (let j = 0; j < ams.length; j++) {
      used.add(ams[j]);
    }
  }
  return used;
}

// ---------- loading ----------

export async function loadRequirementsForRun(newRunId) {
  runId = newRunId;
  requirements = loadLocal(runId);
  if (!requirements.length) {
    try {
      requirements = await loadFromBackendThenCache(runId);
    } catch (e) {
      requirements = loadLocal(runId);
    }
  }
  renumber();
}

// ---------- operations (toggle, move, delete, save) ----------

export async function toggleRequirementActive(id) {
  for (let i = 0; i < requirements.length; i++) {
    if (requirements[i].id === id) {
      requirements[i].active = !requirements[i].active;
      break;
    }
  }
  await persist();
}

export async function moveRequirement(id, direction) {
  const idx = requirements.findIndex((r) => r.id === id);
  if (idx < 0) return;

  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= requirements.length) return;

  const tmp = requirements[idx];
  requirements[idx] = requirements[newIdx];
  requirements[newIdx] = tmp;

  renumber();
  await persist();
}

export async function deleteRequirement(id) {
  const idx = requirements.findIndex((r) => r.id === id);
  if (idx < 0) return;
  requirements.splice(idx, 1);
  renumber();
  await persist();
}

/**
 * Save or update a requirement.
 * args: { id|null, amenities[], label, operator, mode, minutes, miles }
 */
export async function saveRequirement({
  id,
  amenities,
  label,
  operator,
  mode,
  minutes,
  miles
}) {
  const ams = Array.isArray(amenities) ? amenities.filter(Boolean) : [];
  const primary = ams[0] || null;

  const minutesNum = parseFloat(minutes || "0");
  const milesNum = parseFloat(miles || "0");
  const mph = MODE_SPEEDS_MPH[mode] || 3;
  const finalLabel = label && label.trim().length
    ? label.trim()
    : deriveDefaultLabel(ams);

  if (id == null) {
    const newId = getNextRequirementId(runId);
    requirements.push({
      id: newId,
      amenity: primary,
      amenities: ams,
      label: finalLabel,
      operator: operator || "within",
      mode: mode || "walk",
      speed_mph: mph,
      minutes: minutesNum,
      miles: milesNum,
      active: true
    });
    renumber();
  } else {
    for (let i = 0; i < requirements.length; i++) {
      if (requirements[i].id === id) {
        const r = requirements[i];
        r.amenity = primary;
        r.amenities = ams;
        r.label = finalLabel;
        r.operator = operator || "within";
        r.mode = mode || "walk";
        r.speed_mph = mph;
        r.minutes = minutesNum;
        r.miles = milesNum;
        break;
      }
    }
  }

  await persist();
}
