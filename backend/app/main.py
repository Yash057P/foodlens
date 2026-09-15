import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import settings
from .services.model_service import create_model_service
from .services.nutrition_service import NutritionService

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FoodLens backend...")
    app.state.nutrition_service = NutritionService(settings.nutrition_db_path)
    app.state.model_service = create_model_service(
        settings.model_id,
        settings.inference_provider,
        settings.device,
        settings.model_dtype,
        settings.hf_token,
    )
    logger.info("FoodLens backend ready.")
    yield
    logger.info("Shutting down FoodLens backend.")


app = FastAPI(title="FoodLens API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["system"])
def root():
    return {
        "message": "FoodLens API is running.",
        "docs": "/docs",
        "health": "/api/health",
        "predict": "/api/predict",
    }