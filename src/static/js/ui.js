// static/js/ui.js
import { state } from "./state.js";
import {
  setupMap,
  getDraw,
  clearAllDataLayers,
  getSelectionBBox,
  showParcelsExtent,
  showAnalysisResults
} from "./map.js";
import { uploadParcelsFile, analyzeSelection } from "./api.js";
import { initRequirementsUI, requirementsOnAnalysisReady, requirementsReset } from "./requirements/ui.js";

export function initApp() {
  setupMap();
  initRequirementsUI(); // wires sidebar + modal UI

  const uploadForm = document.getElementById("upload-form");
  const parcelsFileInput = document.getElementById("parcels-file");
  const btnUpload = document.getElementById("btn-upload");
  const btnClearSelection = document.getElementById("btn-clear-selection");
  const btnAnalyze = document.getElementById("btn-analyze");
  const statusEl = document.getElementById("status");

  btnClearSelection.addEventListener("click", () => {
    const draw = getDraw();
    if (draw) {
      draw.deleteAll();
    }
    clearAllDataLayers();
    statusEl.textContent = "Selection cleared.";
    btnAnalyze.disabled = true;
    btnClearSelection.disabled = true;

    state.lastAmenitiesGeojson = null;
    requirementsReset();
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!parcelsFileInput.files.length) {
      statusEl.textContent = "Choose a parcels file first.";
      return;
    }

    const file = parcelsFileInput.files[0];
    statusEl.textContent = "Uploading parcels...";
    btnUpload.disabled = true;

    try {
      const data = await uploadParcelsFile(file);
      state.runId = data.run_id;

      statusEl.textContent =
        "Parcels uploaded. Draw an area with the polygon tool, then click Analyze.";

      showParcelsExtent(data.extent, data.bbox);

      btnClearSelection.disabled = false;
      btnAnalyze.disabled = false;

      requirementsReset(); // new run id context starts clean on UI side
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error uploading parcels.";
    } finally {
      btnUpload.disabled = false;
    }
  });

  btnAnalyze.addEventListener("click", async () => {
    if (!state.runId) {
      statusEl.textContent = "Upload parcels first.";
      return;
    }

    const bbox = getSelectionBBox();
    if (!bbox) {
      statusEl.textContent =
        "Draw an area with the polygon tool (top-left) before analyzing.";
      return;
    }

    statusEl.textContent = "Running analysis (parcels + OSM)...";
    btnAnalyze.disabled = true;

    try {
      const result = await analyzeSelection(state.runId, bbox);

      clearAllDataLayers();
      showAnalysisResults(result.parcels, result.amenities);

      state.lastAmenitiesGeojson = result.amenities;

      statusEl.textContent =
        `Analysis done. Parcels: ${result.parcels.features.length}, amenities: ${result.amenities.features.length}.`;

      // Auto-open requirements UI now that we have amenities in the selected area
      requirementsOnAnalysisReady(state.runId, state.lastAmenitiesGeojson);

    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error during analysis.";
    } finally {
      btnAnalyze.disabled = false;
    }
  });
}
