"""
Health and Model Information Endpoints.
"""

from fastapi import APIRouter
from app.services.yolo_service import yolo_service
from app.schemas.inspection import ModelInfoResponse

router = APIRouter(tags=["Health & Model"])

@router.get("/health")
async def health_check():
    info = yolo_service.get_info()
    return {
        "status": "healthy" if info["weights_loaded"] else "degraded",
        "service": "RoadVision AI Backend",
        "device": info["device"],
        "model_loaded": info["weights_loaded"],
        "model_filename": info.get("model_filename", "best.pt"),
        "model_path": info["model_path"],
        "classes_count": info["num_classes"],
        "classes": info["classes"]
    }

@router.get("/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    return yolo_service.get_info()
