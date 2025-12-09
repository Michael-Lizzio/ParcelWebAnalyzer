// static/js/map.js
import { layerConfig } from "./state.js";

let map = null;
let draw = null;
let amenitiesEventsBound = false;

// styling state for amenities
let appliedAmenitiesInternal = []; // [{ amenity, color }]
let showAllAmenitiesInternal = true;

export function setupMap() {
  mapboxgl.accessToken = window.MAPBOX_TOKEN;

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-122.33, 47.6],
    zoom: 11
  });

  draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true
    }
  });

  map.addControl(draw, "top-left");
  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  return { map, draw };
}

export function getMap() {
  return map;
}

export function getDraw() {
  return draw;
}

export function clearAllDataLayers() {
  if (!map) return;

  // Extent
  if (map.getLayer(layerConfig.extentLayerId)) {
    map.removeLayer(layerConfig.extentLayerId);
  }
  if (map.getSource(layerConfig.extentSourceId)) {
    map.removeSource(layerConfig.extentSourceId);
  }

  // Parcels
  if (map.getLayer(layerConfig.parcelsLayerId)) {
    map.removeLayer(layerConfig.parcelsLayerId);
  }
  if (map.getSource(layerConfig.parcelsSourceId)) {
    map.removeSource(layerConfig.parcelsSourceId);
  }

  // Amenities
  if (map.getLayer(layerConfig.amenitiesSymbolsLayerId)) {
    map.removeLayer(layerConfig.amenitiesSymbolsLayerId);
  }
  if (map.getLayer(layerConfig.amenitiesPointsLayerId)) {
    map.removeLayer(layerConfig.amenitiesPointsLayerId);
  }
  if (map.getSource(layerConfig.amenitiesSourceId)) {
    map.removeSource(layerConfig.amenitiesSourceId);
  }
}

export function getSelectionBBox() {
  if (!draw) return null;

  const data = draw.getAll();
  if (!data || !data.features.length) {
    return null;
  }
  const feature = data.features[0];
  if (!feature.geometry || feature.geometry.type !== "Polygon") {
    return null;
  }

  const coords = feature.geometry.coordinates[0];
  let west = 180,
    south = 90,
    east = -180,
    north = -90;

  coords.forEach(([lng, lat]) => {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  });

  return { south, west, north, east };
}

export function showParcelsExtent(extentGeojson, bbox) {
  if (!map) return;

  if (map.getSource(layerConfig.extentSourceId)) {
    map.getSource(layerConfig.extentSourceId).setData(extentGeojson);
  } else {
    map.addSource(layerConfig.extentSourceId, {
      type: "geojson",
      data: extentGeojson
    });

    map.addLayer({
      id: layerConfig.extentLayerId,
      type: "line",
      source: layerConfig.extentSourceId,
      paint: {
        "line-color": "#0ea5e9",
        "line-width": 3,
        "line-dasharray": [2, 2]
      }
    });
  }

  map.fitBounds(
    [
      [bbox.west, bbox.south],
      [bbox.east, bbox.north]
    ],
    { padding: 40, duration: 800 }
  );
}

export function showAnalysisResults(parcelsGeojson, amenitiesGeojson) {
  if (!map) return;

  // Parcels as lines
  if (map.getSource(layerConfig.parcelsSourceId)) {
    map.getSource(layerConfig.parcelsSourceId).setData(parcelsGeojson);
  } else {
    map.addSource(layerConfig.parcelsSourceId, {
      type: "geojson",
      data: parcelsGeojson
    });

    map.addLayer({
      id: layerConfig.parcelsLayerId,
      type: "line",
      source: layerConfig.parcelsSourceId,
      paint: {
        "line-color": "#22c55e",
        "line-width": 1
      }
    });
  }

  // Amenities as points + labels
  if (map.getSource(layerConfig.amenitiesSourceId)) {
    map.getSource(layerConfig.amenitiesSourceId).setData(amenitiesGeojson);
  } else {
    map.addSource(layerConfig.amenitiesSourceId, {
      type: "geojson",
      data: amenitiesGeojson
    });

    map.addLayer({
      id: layerConfig.amenitiesPointsLayerId,
      type: "circle",
      source: layerConfig.amenitiesSourceId,
      paint: {
        "circle-radius": 4,
        "circle-color": "#111827",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff"
      }
    });

    map.addLayer({
      id: layerConfig.amenitiesSymbolsLayerId,
      type: "symbol",
      source: layerConfig.amenitiesSourceId,
      layout: {
        "text-field": [
          "coalesce",
          ["get", "name"],
          ""
        ],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#111827"
      }
    });

    if (!amenitiesEventsBound) {
      map.on("click", layerConfig.amenitiesPointsLayerId, (e) => {
        const feat = e.features[0];
        const props = feat.properties || {};
        const name = props.name || "(no name)";
        const amenity = props.amenity || "unknown amenity";

        new mapboxgl.Popup()
          .setLngLat(feat.geometry.coordinates)
          .setHTML(`<strong>${name}</strong><br>${amenity}`)
          .addTo(map);
      });

      map.on("mouseenter", layerConfig.amenitiesPointsLayerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", layerConfig.amenitiesPointsLayerId, () => {
        map.getCanvas().style.cursor = "";
      });

      amenitiesEventsBound = true;
    }
  }

  // Apply any current styling (colors + filter)
  applyCurrentAmenityStyling();
}

// Called by requirements UI whenever colors / applied set or showAll changes
export function updateAmenitiesStyling(appliedAmenityList, showAll) {
  appliedAmenitiesInternal = appliedAmenityList || [];
  showAllAmenitiesInternal = !!showAll;
  applyCurrentAmenityStyling();
}

function applyCurrentAmenityStyling() {
  if (!map) return;
  if (!map.getLayer(layerConfig.amenitiesPointsLayerId)) return;

  const pointsId = layerConfig.amenitiesPointsLayerId;
  const symbolsId = layerConfig.amenitiesSymbolsLayerId;

  // Color expression: match amenity -> color, else default
  const defaultColor = showAllAmenitiesInternal ? "#111827" : "rgba(0,0,0,0)";
  const colorExpr = ["match", ["get", "amenity"]];

  for (let i = 0; i < appliedAmenitiesInternal.length; i++) {
    const a = appliedAmenitiesInternal[i];
    colorExpr.push(a.amenity, a.color);
  }
  colorExpr.push(defaultColor);

  map.setPaintProperty(pointsId, "circle-color", colorExpr);

  // Filter expression: show all vs only applied
  if (!showAllAmenitiesInternal) {
    if (appliedAmenitiesInternal.length === 0) {
      // Hide all amenities
      const filterExpr = ["==", ["get", "amenity"], "__no_such_amenity__"];
      map.setFilter(pointsId, filterExpr);
      if (map.getLayer(symbolsId)) map.setFilter(symbolsId, filterExpr);
    } else {
      const amenityValues = appliedAmenitiesInternal.map((a) => a.amenity);
      const filterExpr = ["in", ["get", "amenity"], ...amenityValues];
      map.setFilter(pointsId, filterExpr);
      if (map.getLayer(symbolsId)) map.setFilter(symbolsId, filterExpr);
    }
  } else {
    // Show everything
    map.setFilter(pointsId, null);
    if (map.getLayer(symbolsId)) map.setFilter(symbolsId, null);
  }
}
