// static/js/api.js

export async function uploadParcelsFile(file) {
  const formData = new FormData();
  formData.append("parcels_file", file);

  const resp = await fetch("/api/parcels/upload", {
    method: "POST",
    body: formData
  });

  if (!resp.ok) {
    throw new Error(`Upload failed: ${resp.status}`);
  }

  return await resp.json(); // { run_id, bbox, extent }
}

export async function analyzeSelection(runId, bbox) {
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, bbox: bbox })
  });

  if (!resp.ok) {
    throw new Error(`Analyze failed: ${resp.status}`);
  }

  return await resp.json(); // { parcels, amenities }
}

export async function getRequirements(runId) {
  const resp = await fetch(`/api/requirements?run_id=${encodeURIComponent(runId)}`);
  if (!resp.ok) {
    throw new Error(`Get requirements failed: ${resp.status}`);
  }
  return await resp.json(); // { requirements: [...] }
}

export async function setRequirements(runId, requirements) {
  const resp = await fetch("/api/requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, requirements: requirements })
  });

  if (!resp.ok) {
    throw new Error(`Set requirements failed: ${resp.status}`);
  }

  return await resp.json(); // { ok: true }
}
