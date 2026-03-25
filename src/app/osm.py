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
    Fetch ALL OSM amenities/POIs for a bbox from the Overpass API and return
    a GeoJSON FeatureCollection.

    We include:
      - amenity=* (restaurants, cafes, schools, hospitals, etc.)
      - shop=* (all shop types: bakery, pharmacy, mall, etc.)
      - leisure=* (parks, playgrounds, sports_centre, swimming_pool, etc.)
      - tourism=* (museums, attractions, hotels, viewpoints, etc.)
      - public_transport=*, railway=*, highway=bus_stop (transit)
      - healthcare=* (clinics, doctors, dentists, etc.)
      - office=* (government, company offices)
      - craft=* (artisans, workshops)
      - emergency=* (fire stations, police)
      - historic=* (monuments, memorials)
      - landuse=* (parks, recreation_ground, village_green)

    Nodes, ways, and relations are all returned; ways/relations use their
    computed 'center' as point geometry.
    """

    # nwr = nodes, ways, relations
    overpass_query = f"""
    [out:json][timeout:25];
    (
      nwr["amenity"]({south},{west},{north},{east});
      nwr["shop"]({south},{west},{north},{east});
      nwr["leisure"]({south},{west},{north},{east});
      nwr["tourism"]({south},{west},{north},{east});
      nwr["public_transport"]({south},{west},{north},{east});
      nwr["railway"]({south},{west},{north},{east});
      nwr["highway"="bus_stop"]({south},{west},{north},{east});
      nwr["healthcare"]({south},{west},{north},{east});
      nwr["office"]({south},{west},{north},{east});
      nwr["craft"]({south},{west},{north},{east});
      nwr["emergency"]({south},{west},{north},{east});
      nwr["historic"]({south},{west},{north},{east});
      nwr["landuse"]["landuse"~"park|recreation_ground|village_green"]({south},{west},{north},{east});
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

        # Normalize to make sure we always have an 'amenity' field to drive the UI
        # We'll use the most specific tag available
        amenity = tags.get("amenity")
        shop = tags.get("shop")
        leisure = tags.get("leisure")
        tourism = tags.get("tourism")
        public_transport = tags.get("public_transport")
        railway = tags.get("railway")
        highway = tags.get("highway")
        healthcare = tags.get("healthcare")
        office = tags.get("office")
        craft = tags.get("craft")
        emergency = tags.get("emergency")
        historic = tags.get("historic")
        landuse = tags.get("landuse")

        # If amenity already exists, use it
        if amenity:
            pass  # already have amenity field

        # Map other tag types to 'amenity' field for UI consistency
        elif shop:
            # Special case: map supermarkets/convenience to grocery_store
            if shop in {"supermarket", "convenience"}:
                amenity = "grocery_store"
            else:
                amenity = f"shop_{shop}"  # e.g., "shop_bakery", "shop_pharmacy"
            tags["amenity"] = amenity

        elif leisure:
            amenity = leisure  # e.g., "park", "playground", "sports_centre"
            tags["amenity"] = amenity

        elif tourism:
            amenity = f"tourism_{tourism}"  # e.g., "tourism_museum", "tourism_hotel"
            tags["amenity"] = amenity

        elif public_transport:
            amenity = f"transit_{public_transport}"  # e.g., "transit_stop_position"
            tags["amenity"] = amenity

        elif railway:
            amenity = f"transit_{railway}"  # e.g., "transit_station"
            tags["amenity"] = amenity

        elif highway == "bus_stop":
            amenity = "transit_bus_stop"
            tags["amenity"] = amenity

        elif healthcare:
            amenity = f"healthcare_{healthcare}"  # e.g., "healthcare_clinic", "healthcare_dentist"
            tags["amenity"] = amenity

        elif office:
            amenity = f"office_{office}"  # e.g., "office_government"
            tags["amenity"] = amenity

        elif craft:
            amenity = f"craft_{craft}"  # e.g., "craft_bakery"
            tags["amenity"] = amenity

        elif emergency:
            amenity = f"emergency_{emergency}"  # e.g., "emergency_fire_station"
            tags["amenity"] = amenity

        elif historic:
            amenity = f"historic_{historic}"  # e.g., "historic_monument"
            tags["amenity"] = amenity

        elif landuse in {"park", "recreation_ground", "village_green"}:
            amenity = f"landuse_{landuse}"  # e.g., "landuse_park"
            tags["amenity"] = amenity

        # If we still don't have an amenity, skip
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
