import os
from dataclasses import dataclass, field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    model_id: str = os.getenv("FOODLENS_MODEL_ID", "nateraw/food")
    device: str = os.getenv("FOODLENS_DEVICE", "auto")
    confidence_threshold: float = float(os.getenv("FOODLENS_CONFIDENCE_THRESHOLD", "0.5"))
    max_upload_bytes: int = int(os.getenv("FOODLENS_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    nutrition_db_path: str = os.getenv(
        "FOODLENS_NUTRITION_DB",
        os.path.join(BASE_DIR, "data", "nutritional_database.json"),
    )
    cors_origins: list = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv(
                "FOODLENS_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",")
        ]
    )
    log_level: str = os.getenv("FOODLENS_LOG_LEVEL", "INFO")


settings = Settings()