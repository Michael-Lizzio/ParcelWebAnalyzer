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

export async function scoreSelection(runId, requirements, parcelsGeojson, amenitiesGeojson) {
  const resp = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: runId,
      requirements: requirements,
      parcels_geojson: parcelsGeojson,
      amenities_geojson: amenitiesGeojson
    })
  });

  if (!resp.ok) {
    throw new Error(`Score failed: ${resp.status}`);
  }

  return await resp.json(); // { parcels_scored_points, parcels_scored_polygons, weights, counts_fields }
}

export async function downloadParcels(runId, parcelsGeojson, format) {
  const resp = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: runId,
      parcels_geojson: parcelsGeojson,
      format: format
    })
  });

  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status}`);
  }

  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === "geojson"
    ? `${runId}_scored.geojson`
    : `${runId}_scored.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
