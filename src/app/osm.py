from __future__ import annotations

from typing import Dict, Any
import requests


def fetch_osm_amenities_bbox(
    south: float,
    west: float,
    north: float,
    east: float,
    timeout: int = 60,
) -> Dict[str, Any]:
    """
    Fetch OSM 'amenities' for a bbox from the Overpass API and return
    a GeoJSON FeatureCollection.

    We include:
      - anything with amenity=*
      - shops tagged as supermarket / convenience
      - landuse=school (for school campuses that aren't tagged amenity=school)

    Nodes, ways, and relations are all returned; ways/relations use their
    computed 'center' as point geometry.
    """

    # nwr = nodes, ways, relations
    overpass_query = f"""
    [out:json][timeout:25];
    (
      nwr["amenity"]({south},{west},{north},{east});
      nwr["shop"]["shop"~"supermarket|convenience"]({south},{west},{north},{east});
      nwr["landuse"="school"]({south},{west},{north},{east});
    );
    out center;
    """

    resp = requests.post(
        "https://overpass-api.de/api/interpreter",
        data={"data": overpass_query},
        timeout=timeout,
    )
    resp.raise_for_status()
    raw = resp.json()

    features = []
    seen: set[tuple[str, int]] = set()

    for el in raw.get("elements", []):
        el_type = el.get("type")
        el_id = el.get("id")

        if el_type is None or el_id is None:
            continue

        key = (el_type, el_id)
        if key in seen:
            continue
        seen.add(key)

        # Get coordinates
        if el_type == "node":
            lat = el.get("lat")
            lon = el.get("lon")
        else:
            # ways/relations: Overpass 'out center;' gives us a 'center' dict
            center = el.get("center")
            if not center:
                continue
            lat = center.get("lat")
            lon = center.get("lon")

        if lat is None or lon is None:
            continue

        tags = el.get("tags", {}).copy()

        # Normalize to make sure we always have an 'amenity' to drive your UI
        amenity = tags.get("amenity")
        shop = tags.get("shop")
        landuse = tags.get("landuse")

        # Treat supermarkets / convenience stores as a "grocery_store" amenity
        if not amenity and shop in {"supermarket", "convenience"}:
            amenity = "grocery_store"
            tags["amenity"] = amenity

        # Treat landuse=school as a 'school' amenity if no amenity already
        if not amenity and landuse == "school":
            amenity = "school"
            tags["amenity"] = amenity

        # If we still don't have an amenity, skip – it's not useful for your UI
        if not amenity:
            continue

        tags["id"] = el_id
        tags["osm_type"] = el_type  # might be handy later

        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": tags,
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}
