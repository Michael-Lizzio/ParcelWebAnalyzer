// static/js/state.js

export const state = {
  runId: null,
  lastAmenitiesGeojson: null,
  lastParcelsGeojson: null,
  scoredParcelsPoints: null,
  scoredParcelsPolygons: null,
  scoreWeights: [],
  countsFields: [],
  requirementsHash: null,
  lastScoredHash: null,
  selectedParcelId: null
};

export const layerConfig = {
  extentSourceId: "parcels-extent",
  extentLayerId: "parcels-extent-outline",
  parcelsSourceId: "parcels",
  parcelsLayerId: "parcels-lines",
  amenitiesSourceId: "amenities",
  amenitiesPointsLayerId: "amenities-points",
  amenitiesSymbolsLayerId: "amenities-symbols",
  scoredParcelsSourceId: "scored-parcels",
  scoredParcelsLayerId: "scored-parcels-fill",
  scoredParcelsOutlineLayerId: "scored-parcels-outline"
};
