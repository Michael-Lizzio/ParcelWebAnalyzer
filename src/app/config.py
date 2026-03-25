import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret")
    BASE_DIR = Path(__file__).resolve().parents[1]
    DATA_DIR = BASE_DIR / "data"
    PARCELS_DIR = DATA_DIR / "parcels"

    MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

    @staticmethod
    def ensure_dirs():
        Config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        Config.PARCELS_DIR.mkdir(parents=True, exist_ok=True)
