"""
RoadVision AI - FastAPI Application Server.
AI-Based Road Damage Detection and Severity Assessment Using YOLO.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.db import init_db
from app.services.yolo_service import yolo_service
from app.api.health import router as health_router
from app.api.predict import router as predict_router
from app.api.inspections import router as inspections_router
from app.api.analytics import router as analytics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("roadvision.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    logger.info("Initializing RoadVision AI database...")
    init_db()
    
    # Verify YOLO model initialization
    model_info = yolo_service.get_info()
    if model_info["weights_loaded"]:
        logger.info(f"YOLO26 Model Ready! Device: {model_info['device']}, Classes: {model_info['classes']}")
    else:
        logger.warning(
            f"Model weights not detected at '{settings.MODEL_PATH}'. "
            "Please ensure best.pt is placed in backend/models/best.pt."
        )
    yield
    logger.info("Shutting down RoadVision AI server.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered road damage detection, severity assessment and risk analysis using YOLO26.",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated inspection outputs (images, videos, CSVs, reports)
app.mount("/api/outputs", StaticFiles(directory=str(settings.OUTPUTS_DIR)), name="outputs")

# Include Routers
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(predict_router, prefix=settings.API_PREFIX)
app.include_router(inspections_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_status": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
