// static/js/map.js
import { layerConfig, state } from "./state.js";

let map = null;
let draw = null;
let amenitiesEventsBound = false;

// styling state for amenities
let appliedAmenitiesInternal = []; // [{ amenity, color }]
let showAllAmenitiesInternal = true;

// parcel click handlers
let parcelClickHandler = null;
let mapClickHandler = null;
let currentPopup = null;

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

export function showScoredParcels(polygonsGeojson, pointsGeojson) {
  if (!map) return;

  // Hide original green parcel lines
  if (map.getLayer(layerConfig.parcelsLayerId)) {
    map.setLayoutProperty(layerConfig.parcelsLayerId, "visibility", "none");
  }

  // Add polygon layer with score-based color
  if (map.getSource(layerConfig.scoredParcelsSourceId)) {
    map.getSource(layerConfig.scoredParcelsSourceId).setData(polygonsGeojson);
  } else {
    map.addSource(layerConfig.scoredParcelsSourceId, {
      type: "geojson",
      data: polygonsGeojson
    });

    // Fill layer with color gradient based on score_norm (0-1)
    map.addLayer({
      id: layerConfig.scoredParcelsLayerId,
      type: "fill",
      source: layerConfig.scoredParcelsSourceId,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "score_norm"],
          0, "#eff6ff",    // light blue for low scores
          0.5, "#3b82f6",  // medium blue
          1, "#1e3a8a"     // dark blue for high scores
        ],
        "fill-opacity": 0.6
      }
    });

    // Outline layer
    map.addLayer({
      id: layerConfig.scoredParcelsOutlineLayerId,
      type: "line",
      source: layerConfig.scoredParcelsSourceId,
      paint: {
        "line-color": "#1e40af",
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          3,  // thicker if selected
          1
        ]
      }
    });
  }

  // Set up click handlers
  setupParcelClickHandlers();
}

export function clearScoredParcels() {
  if (!map) return;

  // Show original green parcel lines again
  if (map.getLayer(layerConfig.parcelsLayerId)) {
    map.setLayoutProperty(layerConfig.parcelsLayerId, "visibility", "visible");
  }

  // Remove scored parcel layers
  if (map.getLayer(layerConfig.scoredParcelsOutlineLayerId)) {
    map.removeLayer(layerConfig.scoredParcelsOutlineLayerId);
  }
  if (map.getLayer(layerConfig.scoredParcelsLayerId)) {
    map.removeLayer(layerConfig.scoredParcelsLayerId);
  }
  if (map.getSource(layerConfig.scoredParcelsSourceId)) {
    map.removeSource(layerConfig.scoredParcelsSourceId);
  }

  // Close popup
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }

  // Reset selection
  state.selectedParcelId = null;

  // Remove click handlers
  if (parcelClickHandler && map.getLayer(layerConfig.scoredParcelsLayerId)) {
    map.off("click", layerConfig.scoredParcelsLayerId, parcelClickHandler);
  }
  if (mapClickHandler) {
    map.off("click", mapClickHandler);
  }
}

function setupParcelClickHandlers() {
  if (!map) return;

  // Remove old handlers if they exist
  if (parcelClickHandler) {
    map.off("click", layerConfig.scoredParcelsLayerId, parcelClickHandler);
  }
  if (mapClickHandler) {
    map.off("click", mapClickHandler);
  }

  // Click on parcel polygon
  parcelClickHandler = (e) => {
    const feature = e.features[0];
    if (!feature) return;

    // Close existing popup
    if (currentPopup) {
      currentPopup.remove();
    }

    // Get parcel ID
    const parcelId = feature.properties.parcel_id || feature.properties.PARCEL_ID || feature.id;

    // Highlight selected parcel
    highlightParcel(parcelId);

    // Filter amenities to show only those within radius of this parcel
    filterAmenitiesToParcel(feature);

    // Show popup with score and counts
    const props = feature.properties;
    const score = props.score !== undefined ? props.score.toFixed(2) : "N/A";
    const scoreNorm = props.score_norm !== undefined ? (props.score_norm * 100).toFixed(1) : "N/A";

    // Build count list
    let countsHtml = "";
    for (const key in props) {
      if (key.startsWith("cnt_")) {
        const amenityType = key.substring(4); // remove "cnt_" prefix
        const count = props[key];
        if (count > 0) {
          countsHtml += `<div><strong>${amenityType}:</strong> ${count}</div>`;
        }
      }
    }

    const html = `
      <div style="max-width: 250px;">
        <h3 style="margin-top: 0;">Parcel Score</h3>
        <div><strong>Score:</strong> ${score}</div>
        <div><strong>Normalized:</strong> ${scoreNorm}%</div>
        <hr style="margin: 8px 0;">
        <h4 style="margin: 8px 0;">Amenity Counts:</h4>
        ${countsHtml || "<div>No amenities nearby</div>"}
      </div>
    `;

    currentPopup = new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  };

  // Click on map (not on parcel) to reset
  mapClickHandler = (e) => {
    // Check if click was on a parcel layer
    const features = map.queryRenderedFeatures(e.point, {
      layers: [layerConfig.scoredParcelsLayerId]
    });

    if (features.length === 0) {
      // Clicked on empty space - reset
      resetParcelSelection();
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
    }
  };

  map.on("click", layerConfig.scoredParcelsLayerId, parcelClickHandler);
  map.on("click", mapClickHandler);

  // Cursor pointer on hover
  map.on("mouseenter", layerConfig.scoredParcelsLayerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", layerConfig.scoredParcelsLayerId, () => {
    map.getCanvas().style.cursor = "";
  });
}

function highlightParcel(parcelId) {
  // Reset previous selection
  if (state.selectedParcelId !== null) {
    map.setFeatureState(
      { source: layerConfig.scoredParcelsSourceId, id: state.selectedParcelId },
      { selected: false }
    );
  }

  // Highlight new selection
  state.selectedParcelId = parcelId;
  map.setFeatureState(
    { source: layerConfig.scoredParcelsSourceId, id: parcelId },
    { selected: true }
  );
}

function resetParcelSelection() {
  if (state.selectedParcelId !== null) {
    map.setFeatureState(
      { source: layerConfig.scoredParcelsSourceId, id: state.selectedParcelId },
      { selected: false }
    );
    state.selectedParcelId = null;
  }

  // Reset amenity filter - show all applied amenities again
  applyCurrentAmenityStyling();
}

function filterAmenitiesToParcel(parcelFeature) {
  // Get amenity types that contributed to this parcel's counts
  const visibleAmenityTypes = [];
  for (const key in parcelFeature.properties) {
    if (key.startsWith("cnt_")) {
      const amenityType = key.substring(4);
      const count = parcelFeature.properties[key];
      if (count > 0) {
        visibleAmenityTypes.push(amenityType);
      }
    }
  }

  // Filter amenities layer
  if (visibleAmenityTypes.length > 0) {
    const filterExpr = ["in", ["get", "amenity"], ["literal", visibleAmenityTypes]];
    map.setFilter(layerConfig.amenitiesPointsLayerId, filterExpr);
    if (map.getLayer(layerConfig.amenitiesSymbolsLayerId)) {
      map.setFilter(layerConfig.amenitiesSymbolsLayerId, filterExpr);
    }
  } else {
    // Hide all amenities
    const filterExpr = ["==", ["get", "amenity"], "__no_such_amenity__"];
    map.setFilter(layerConfig.amenitiesPointsLayerId, filterExpr);
    if (map.getLayer(layerConfig.amenitiesSymbolsLayerId)) {
      map.setFilter(layerConfig.amenitiesSymbolsLayerId, filterExpr);
    }
  }
}
