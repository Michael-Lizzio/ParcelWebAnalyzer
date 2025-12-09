// static/js/state.js

export const state = {
  runId: null,
  lastAmenitiesGeojson: null
};

export const layerConfig = {
  extentSourceId: "parcels-extent",
  extentLayerId: "parcels-extent-outline",
  parcelsSourceId: "parcels",
  parcelsLayerId: "parcels-lines",
  amenitiesSourceId: "amenities",
  amenitiesPointsLayerId: "amenities-points",
  amenitiesSymbolsLayerId: "amenities-symbols"
};
