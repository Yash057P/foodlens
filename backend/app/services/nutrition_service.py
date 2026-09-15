import json
import logging

logger = logging.getLogger(__name__)


class NutritionService:
    """Lookup of reference nutrition values (per 100 g) by food class."""

    def __init__(self, db_path: str):
        with open(db_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        self._db = {self._normalize(k): v for k, v in raw.items()}
        logger.info("Loaded nutrition database with %d entries", len(self._db))

    @staticmethod
    def _normalize(name: str) -> str:
        return name.strip().lower().replace(" ", "_").replace("-", "_")

    def get(self, class_name: str):
        """Return the nutrition record for a food class, or None if unknown."""
        return self._db.get(self._normalize(class_name))

    def keys(self):
        return set(self._db.keys())