// static/js/requirements/store.js
import { getRequirements, setRequirements } from "../api.js";

function keyReq(runId) {
  return `requirements_${runId}`;
}

function keyNextId(runId) {
  return `requirements_next_id_${runId}`;
}

export function getNextRequirementId(runId) {
  const k = keyNextId(runId);
  const cur = localStorage.getItem(k);
  let n = 1;
  if (cur !== null) {
    const parsed = parseInt(cur, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) n = parsed;
  }
  localStorage.setItem(k, String(n + 1));
  return n;
}

export function loadLocal(runId) {
  const raw = localStorage.getItem(keyReq(runId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveLocal(runId, requirements) {
  localStorage.setItem(keyReq(runId), JSON.stringify(requirements, null, 2));
}

export async function loadFromBackendThenCache(runId) {
  const res = await getRequirements(runId);
  const reqs = res.requirements || [];
  saveLocal(runId, reqs);
  return reqs;
}

export async function saveBoth(runId, requirements) {
  saveLocal(runId, requirements);
  await setRequirements(runId, requirements);
}
