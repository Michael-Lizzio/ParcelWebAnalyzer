from __future__ import annotations

from typing import Any, Dict, List, Tuple, Optional
import math

import pandas as pd
import geopandas as gpd
from shapely.geometry import shape


METERS_PER_MILE = 1609.344


def _gdf_from_geojson(fc: Dict[str, Any], crs: str = "EPSG:4326") -> gpd.GeoDataFrame:
    feats = fc.get("features", []) if isinstance(fc, dict) else []
    rows = []
    geoms = []
    for f in feats:
        geom = f.get("geometry")
        if not geom:
            continue
        try:
            geoms.append(shape(geom))
        except Exception:
            continue
        props = f.get("properties") or {}
        if not isinstance(props, dict):
            props = {}
        rows.append(props)
    return gpd.GeoDataFrame(rows, geometry=geoms, crs=crs)


def _pick_id_column(gdf: gpd.GeoDataFrame) -> str:
    candidates = [
        "parcel_id", "PARCEL_ID",
        "OBJECTID", "OBJECTID_1",
        "id", "ID",
        "PIN", "APN",
        "PARCELNO", "PARCELNBR", "PARCEL_NUM",
        "taxlot", "tax_lot",
    ]
    for c in candidates:
        if c in gdf.columns:
            return c
    # create one
    gdf["parcel_id"] = [str(i + 1) for i in range(len(gdf))]
    return "parcel_id"


def _normalize_requirements(reqs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for r in reqs or []:
        if not isinstance(r, dict):
            continue
        if not r.get("active", True):
            continue
        ams = r.get("amenities")
        if not isinstance(ams, list) or not ams:
            a = r.get("amenity")
            ams = [a] if a else []
        ams = [str(a) for a in ams if a]
        if not ams:
            continue

        miles = float(r.get("miles", 0) or 0)
        if miles <= 0:
            continue

        rid = int(r.get("id", 0) or 0)
        out.append({
            "id": rid,
            "label": str(r.get("label") or ""),
            "operator": str(r.get("operator") or "within"),
            "miles": miles,
            "amenities": ams,
        })

    # priority order = id ascending (1..n)
    out.sort(key=lambda x: x["id"])
    return out


def _triangular_weights(n: int) -> List[float]:
    """
    Matches your examples:
      n=2 -> raw [3,1] => [75,25]
      n=3 -> raw [6,3,1] => [60,30,10]

    raw_i = k*(k+1)/2 where k descends n..1
    """
    if n <= 0:
        return []
    raws = []
    for i in range(n):
        k = n - i
        raws.append((k * (k + 1)) / 2.0)
    total = sum(raws) or 1.0
    return [(r / total) * 100.0 for r in raws]


def score_parcels(
    parcels_fc: Dict[str, Any],
    amenities_fc: Dict[str, Any],
    requirements: List[Dict[str, Any]],
    metric_epsg: int = 32610,  # Seattle area UTM
) -> Dict[str, Any]:
    """
    Returns:
      {
        "parcels_scored_points": FeatureCollection,
        "parcels_scored_polygons": FeatureCollection,
        "weights": [ {id,label,weight,miles,amenities,operator}... ],
        "counts_fields": ["restaurant","school",...]
      }
    """
    parcels = _gdf_from_geojson(parcels_fc)
    amenities = _gdf_from_geojson(amenities_fc)

    if parcels.empty:
        return {
            "parcels_scored_points": {"type": "FeatureCollection", "features": []},
            "parcels_scored_polygons": {"type": "FeatureCollection", "features": []},
            "weights": [],
            "counts_fields": [],
        }

    pid_col = _pick_id_column(parcels)
    parcels[pid_col] = parcels[pid_col].astype(str)

    # Amenities must be points and must have "amenity"
    if not amenities.empty and "amenity" in amenities.columns:
        amenities["amenity"] = amenities["amenity"].astype(str)
        amenities = amenities[amenities.geometry.notna()].copy()
        # force to points only (if you later pass polygons here)
        amenities = amenities[amenities.geometry.geom_type.isin(["Point"])].copy()
    else:
        amenities = amenities.iloc[0:0].copy()

    active = _normalize_requirements(requirements)
    weights = _triangular_weights(len(active))

    # Prep outputs
    parcels_wgs = parcels.to_crs(epsg=4326)
    parcels_m = parcels.to_crs(epsg=metric_epsg)

    # counts table indexed by parcel id
    idx = parcels_m[pid_col].tolist()
    counts_df = pd.DataFrame(index=idx)
    group_sums: Dict[int, pd.Series] = {}

    if not amenities.empty and active:
        amenities_m = amenities.to_crs(epsg=metric_epsg)

        for ri, req in enumerate(active):
            miles = float(req["miles"])
            radius_m = miles * METERS_PER_MILE

            ams = req["amenities"]
            subset = amenities_m[amenities_m["amenity"].isin(ams)].copy()
            if subset.empty:
                # still record a 0 series so scoring doesn't crash
                group_sums[req["id"]] = pd.Series(0, index=counts_df.index, dtype=float)
                continue

            buffers = subset[["amenity", "geometry"]].copy()
            buffers["geometry"] = buffers.geometry.buffer(radius_m)

            # spatial join parcels with buffers
            try:
                joined = gpd.sjoin(
                    parcels_m[[pid_col, "geometry"]],
                    buffers[["amenity", "geometry"]],
                    how="left",
                    predicate="intersects",
                )
            except TypeError:
                # older geopandas fallback
                joined = gpd.sjoin(
                    parcels_m[[pid_col, "geometry"]],
                    buffers[["amenity", "geometry"]],
                    how="left",
                    op="intersects",
                )

            joined = joined.dropna(subset=["amenity"])
            if joined.empty:
                group_sums[req["id"]] = pd.Series(0, index=counts_df.index, dtype=float)
                continue

            ctab = (
                joined.groupby([pid_col, "amenity"])
                .size()
                .unstack(fill_value=0)
            )

            # add counts per amenity
            for col in ctab.columns:
                if col not in counts_df.columns:
                    counts_df[col] = 0
                # align indices
                counts_df.loc[ctab.index, col] = counts_df.loc[ctab.index, col] + ctab[col]

            # group sum for this requirement (sum of its amenity types)
            gs = ctab.sum(axis=1)
            # align to all parcels
            group_sums[req["id"]] = gs.reindex(counts_df.index).fillna(0).astype(float)

    # ensure all parcels have all columns as ints
    counts_df = counts_df.fillna(0)
    for c in counts_df.columns:
        counts_df[c] = counts_df[c].astype(int)

    # scoring (NOTE: operator "not_within" not used for score yet — only counts)
    score_raw = pd.Series(0.0, index=counts_df.index)
    weights_out = []
    for i, req in enumerate(active):
        w = float(weights[i]) if i < len(weights) else 0.0
        rid = req["id"]
        gs = group_sums.get(rid)
        if gs is None:
            gs = pd.Series(0.0, index=counts_df.index)
        score_raw = score_raw + (w * gs)

        weights_out.append({
            "id": rid,
            "label": req["label"],
            "operator": req["operator"],
            "miles": req["miles"],
            "amenities": req["amenities"],
            "weight": w,
        })

    if len(score_raw) > 0:
        minv = float(score_raw.min())
        score = score_raw - minv
        maxv = float(score.max()) if len(score) else 0.0
    else:
        score = score_raw
        maxv = 0.0

    score_norm = score.copy()
    if maxv > 0:
        score_norm = score / maxv
    else:
        score_norm[:] = 0.0

    # attach columns to polygons
    attrs = counts_df.copy()
    # prefixed count fields for frontend popup
    attrs_pref = pd.DataFrame(index=attrs.index)
    for c in attrs.columns:
        attrs_pref[f"cnt_{c}"] = attrs[c].astype(int)

    attrs_pref["score_raw"] = score_raw
    attrs_pref["score"] = score
    attrs_pref["score_norm"] = score_norm

    attrs_pref = attrs_pref.reset_index().rename(columns={"index": pid_col})

    polygons_out = parcels_wgs.merge(attrs_pref, on=pid_col, how="left").fillna(0)

    # points = centroids for map
    cent_m = parcels_m.copy()
    cent_m["geometry"] = cent_m.geometry.centroid
    cent_wgs = cent_m.to_crs(epsg=4326)
    points_out = cent_wgs.merge(attrs_pref, on=pid_col, how="left").fillna(0)

    polygons_fc_out = polygons_out.to_json()
    points_fc_out = points_out.to_json()

    # return as dicts, not strings
    import json
    return {
        "parcels_scored_points": json.loads(points_fc_out),
        "parcels_scored_polygons": json.loads(polygons_fc_out),
        "weights": weights_out,
        "counts_fields": list(counts_df.columns),
    }
