from __future__ import annotations

import uuid
from pathlib import Path
from typing import Dict, Any

import geopandas as gpd
from shapely.geometry import Polygon


def _to_wgs84(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Reproject to WGS84 if needed."""
    if gdf.crs is None:
        # assume it's already lon/lat; you can tweak this if needed
        return gdf
    if gdf.crs.to_epsg() == 4326:
        return gdf
    return gdf.to_crs(epsg=4326)


def handle_parcels_upload(
    file_path: Path,
    parcels_dir: Path,
) -> Dict[str, Any]:
    """
    Read uploaded parcels (gpkg / shapefile / zip), normalize to WGS84,
    save as a canonical GeoPackage, and return:
      - run_id
      - bbox (south, west, north, east)
      - extent_geojson (bbox polygon feature)
    """
    run_id = str(uuid.uuid4())
    run_dir = parcels_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Read with GeoPandas (works for .gpkg, .shp, .geojson, .zip shapefile)
    gdf = gpd.read_file(file_path)
    gdf = _to_wgs84(gdf)

    # Save canonical file for this run
    canonical_path = run_dir / "parcels.gpkg"
    gdf.to_file(canonical_path, driver="GPKG")

    # Compute bounding box
    minx, miny, maxx, maxy = gdf.total_bounds

    bbox_poly = Polygon(
        [
            (minx, miny),
            (maxx, miny),
            (maxx, maxy),
            (minx, maxy),
            (minx, miny),
        ]
    )
    extent_gdf = gpd.GeoDataFrame(index=[0], geometry=[bbox_poly], crs="EPSG:4326")

    extent_geojson = extent_gdf.__geo_interface__

    return {
        "run_id": run_id,
        "bbox": {
            "south": float(miny),
            "west": float(minx),
            "north": float(maxy),
            "east": float(maxx),
        },
        "extent_geojson": extent_geojson,
        "canonical_path": str(canonical_path),
    }


def subset_parcels_to_bbox(
    run_id: str,
    parcels_dir: Path,
    south: float,
    west: float,
    north: float,
    east: float,
) -> Dict[str, Any]:
    """
    Load saved parcels for a run and subset them to the given bbox.
    Returns GeoJSON FeatureCollection.
    """
    run_dir = parcels_dir / run_id
    canonical_path = run_dir / "parcels.gpkg"
    if not canonical_path.exists():
        raise FileNotFoundError(f"No parcels found for run_id={run_id}")

    gdf = gpd.read_file(canonical_path)
    gdf = _to_wgs84(gdf)

    # simple bbox filter first (fast)
    minx, miny, maxx, maxy = west, south, east, north
    gdf_subset = gdf.cx[minx:maxx, miny:maxy]

    # For now we just return them as-is
    return gdf_subset.__geo_interface__
