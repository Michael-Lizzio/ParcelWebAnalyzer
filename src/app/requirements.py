# app/requirements.py
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Dict, Any


def requirements_path(parcels_dir: Path, run_id: str) -> Path:
    run_dir = parcels_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir / "requirements.json"


def load_requirements(parcels_dir: Path, run_id: str) -> List[Dict[str, Any]]:
    path = requirements_path(parcels_dir, run_id)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def save_requirements(parcels_dir: Path, run_id: str, requirements: List[Dict[str, Any]]) -> None:
    path = requirements_path(parcels_dir, run_id)
    path.write_text(json.dumps(requirements, indent=2), encoding="utf-8")
