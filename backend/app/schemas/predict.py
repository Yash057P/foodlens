from typing import Any, Dict, List, Optional

from pydantic import BaseModel

NUTRITION_DISCLAIMER = (
    "Nutrition values are reference values per 100 g and are not an exact "
    "measurement of the quantity present in the uploaded image."
)


class Prediction(BaseModel):
    food: str
    confidence: float


class FallbackResult(BaseModel):
    has_food: bool
    food_name: Optional[str] = None
    description: str = ""


class PredictResponse(BaseModel):
    success: bool
    prediction: Optional[Prediction] = None
    top_predictions: List[Prediction] = []
    nutrition_per_100g: Optional[Dict[str, Any]] = None
    nutrition_status: str = "not_available"
    low_confidence: bool = False
    warning: Optional[str] = None
    inference_time_ms: float = 0.0
    fallback: Optional[FallbackResult] = None
    disclaimer: str = NUTRITION_DISCLAIMER