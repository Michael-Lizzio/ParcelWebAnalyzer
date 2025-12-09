from __future__ import annotations

import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from flask import (
    Blueprint,
    current_app,
    render_template,
    request,
    jsonify,
)

from .config import Config
from .parcels import handle_parcels_upload, subset_parcels_to_bbox
from .osm import fetch_osm_amenities_bbox
from .requirements import load_requirements, save_requirements

bp = Blueprint("main", __name__)


@bp.route("/", methods=["GET"])
def index():
    Config.ensure_dirs()
    return render_template("index.html", mapbox_token=current_app.config["MAPBOX_TOKEN"])


@bp.post("/api/parcels/upload")
def api_parcels_upload():
    """
    Accept a parcel dataset upload.
    Supported: .gpkg, .geojson, .shp, zipped shapefile (.zip).
    Returns run_id, bbox, and extent polygon as GeoJSON.
    """
    Config.ensure_dirs()

    file = request.files.get("parcels_file")
    if not file or file.filename == "":
        return jsonify({"error": "No file uploaded"}), 400

    suffix = os.path.splitext(file.filename)[1] or ".gpkg"
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = Path(tmp.name)

    try:
        result = handle_parcels_upload(tmp_path, Config.PARCELS_DIR)

        # initialize empty requirements on backend for this run
        save_requirements(Config.PARCELS_DIR, result["run_id"], [])
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    return jsonify(
        {
            "run_id": result["run_id"],
            "bbox": result["bbox"],
            "extent": result["extent_geojson"],
        }
    )


@bp.post("/api/analyze")
def api_analyze():
    """
    Given a run_id and a selection bbox, return:
      - parcels inside bbox (lines)
      - OSM amenities inside bbox (points)
    """
    data = request.get_json() or {}
    run_id = data.get("run_id")
    bbox = data.get("bbox") or {}

    try:
        south = float(bbox["south"])
        west = float(bbox["west"])
        north = float(bbox["north"])
        east = float(bbox["east"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Invalid bbox"}), 400

    if not run_id:
        return jsonify({"error": "Missing run_id"}), 400

    try:
        parcels_geojson = subset_parcels_to_bbox(
            run_id,
            Config.PARCELS_DIR,
            south=south,
            west=west,
            north=north,
            east=east,
        )
    except FileNotFoundError:
        return jsonify({"error": "Unknown run_id"}), 404

    amenities_geojson = fetch_osm_amenities_bbox(
        south=south, west=west, north=north, east=east
    )

    return jsonify(
        {"parcels": parcels_geojson, "amenities": amenities_geojson}
    )


@bp.get("/api/requirements")
def api_get_requirements():
    Config.ensure_dirs()

    run_id = request.args.get("run_id", "").strip()
    if not run_id:
        return jsonify({"error": "Missing run_id"}), 400

    reqs = load_requirements(Config.PARCELS_DIR, run_id)
    return jsonify({"requirements": reqs})


@bp.post("/api/requirements")
def api_set_requirements():
    Config.ensure_dirs()

    data = request.get_json() or {}
    run_id = (data.get("run_id") or "").strip()
    reqs = data.get("requirements")

    if not run_id:
        return jsonify({"error": "Missing run_id"}), 400
    if not isinstance(reqs, list):
        return jsonify({"error": "requirements must be a list"}), 400

    save_requirements(Config.PARCELS_DIR, run_id, reqs)
    return jsonify({"ok": True})
