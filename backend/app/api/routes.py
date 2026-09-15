import asyncio
import logging
from typing import List, Tuple

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from ..config import settings
from ..schemas.predict import PredictResponse, Prediction
from ..services.model_service import AIModelService, HFInferenceError
from ..services.nutrition_service import NutritionService
from ..utils.image_utils import decode_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["predict"])


def _services(request: Request) -> Tuple[AIModelService, NutritionService]:
    return request.app.state.model_service, request.app.state.nutrition_service


@router.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


@router.post("/predict", response_model=PredictResponse)
async def predict(request: Request, file: UploadFile = File(...)):
    model_service, nutrition_service = _services(request)

    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum allowed size is {settings.max_upload_bytes // (1024 * 1024)} MB.",
        )
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        image = decode_image(data)
    except ValueError as exc:
        logger.warning("Image validation failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        ranked, inference_ms = await asyncio.to_thread(model_service.predict, image)
    except HFInferenceError as exc:
        logger.error("Hosted inference unavailable: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Food recognition service is temporarily unavailable. Please try again in a moment.",
        )
    except Exception as exc:  # inference errors must never leak stack traces to users
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Model inference failed. Please try again.")

    if not ranked:
        raise HTTPException(status_code=500, detail="Model returned no predictions.")

    primary_food, primary_conf = ranked[0]
    low_confidence = primary_conf < settings.confidence_threshold

    if low_confidence:
        nutrition, nutrition_status = None, "uncertain"
        warning = "Uncertain prediction - try a clearer image."
    else:
        nutrition = nutrition_service.get(primary_food)
        if nutrition is None:
            nutrition_status = "not_available"
            warning = "Nutrition information is currently unavailable for this food."
        else:
            nutrition_status = "available"
            warning = None

    return PredictResponse(
        success=True,
        prediction=Prediction(food=primary_food, confidence=round(primary_conf, 4)),
        top_predictions=[
            Prediction(food=food, confidence=round(conf, 4)) for food, conf in ranked
        ],
        nutrition_per_100g=nutrition,
        nutrition_status=nutrition_status,
        low_confidence=low_confidence,
        warning=warning,
        inference_time_ms=round(inference_ms, 1),
    )