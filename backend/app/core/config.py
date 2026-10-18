import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def resolve_model_path() -> str:
    env_path = os.getenv("MODEL_PATH")
    if env_path:
        p = Path(env_path)
        if not p.is_absolute():
            p = (BASE_DIR / p).resolve()
        return str(p.absolute())
    default_p = (BASE_DIR / "models" / "best.pt").resolve()
    return str(default_p.absolute())

class Settings(BaseSettings):
    PROJECT_NAME: str = "RoadVision AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Model Configuration (Always strictly resolved absolute path)
    MODEL_PATH: str = resolve_model_path()
    CONF_THRESHOLD_DEFAULT: float = 0.20
    IOU_THRESHOLD_DEFAULT: float = 0.45
    IMG_SIZE_DEFAULT: int = 640
    
    # Paths
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"
    TEMP_DIR: Path = BASE_DIR / "temp"
    DATABASE_PATH: Path = BASE_DIR / "roadvision.db"
    
    # Max Upload Sizes
    MAX_IMAGE_SIZE_MB: int = 25
    MAX_VIDEO_SIZE_MB: int = 250
    
    # Hazard weights reflecting road danger (from notebook Cell 10 and research paper)
    CLASS_WEIGHTS: Dict[str, float] = {
        'pothole': 1.00,          # Deep structural cavity (tire / suspension hazard)
        'pothole_water': 1.00,    # Deep hidden water-filled cavity
        'pothole_water_m': 1.00,  # Multiple water-filled potholes
        'rut': 0.90,              # Wheelpath groove (aquaplaning / steering loss)
        'undulation': 0.85,       # Vertical heave / upheaval
        'damage': 0.85,           # Structural asphalt failure
        'abscission': 0.70,       # Surface delamination / peeling
        'crack': 0.60,            # Surface fracture (water infiltration conduit)
        'repair': 0.30            # Pre-existing patch
    }
    
    # Severity Thresholds
    SEVERITY_LOW_MAX: float = 0.35
    SEVERITY_MED_MAX: float = 0.65
    
    # Colors for Severity (RGB and BGR)
    SEVERITY_COLORS_RGB: Dict[str, Tuple[int, int, int]] = {
        'Low': (46, 204, 113),      # Emerald Green
        'Medium': (243, 156, 18),   # Amber Orange
        'High': (231, 76, 60)       # Crimson Red
    }
    
    SEVERITY_COLORS_BGR: Dict[str, Tuple[int, int, int]] = {
        'Low': (113, 204, 46),
        'Medium': (18, 156, 243),
        'High': (60, 76, 231)
    }
    
    # Distinct Class Colors (RGB)
    CLASS_COLORS_RGB: Dict[str, Tuple[int, int, int]] = {
        'pothole': (255, 50, 50),
        'pothole_water': (239, 68, 68),
        'pothole_water_m': (220, 38, 38),
        'crack': (50, 200, 50),
        'rut': (50, 100, 255),
        'abscission': (255, 165, 0),
        'undulation': (180, 50, 200),
        'repair': (0, 215, 255),
        'damage': (244, 63, 94)
    }

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()

# Ensure directories exist
settings.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
