"""
Prediction Endpoints for Image and Video Road Damage Analysis.
"""

import os
import uuid
import shutil
import cv2
import numpy as np
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from typing import Optional

from app.core.config import settings
from app.services.yolo_service import yolo_service
from app.services.video_service import VideoService
from app.services.report_service import ReportService
from app.database.db import InspectionRepository, JobRepository
from app.schemas.inspection import InspectionResponse, JobStatusResponse

router = APIRouter(prefix="", tags=["Inference"])

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

@router.post("/predict/image", response_model=InspectionResponse)
async def predict_image(
    file: UploadFile = File(...),
    conf_threshold: float = Form(settings.CONF_THRESHOLD_DEFAULT),
    iou_threshold: float = Form(settings.IOU_THRESHOLD_DEFAULT),
    imgsz: int = Form(settings.IMG_SIZE_DEFAULT)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format: '{ext}'. Supported formats: {', '.join(ALLOWED_IMAGE_EXTS)}"
        )

    # Read image contents
    contents = await file.read()
    if len(contents) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image exceeds maximum permitted size of {settings.MAX_IMAGE_SIZE_MB}MB."
        )

    # Decode image via OpenCV
    np_arr = np.frombuffer(contents, np.uint8)
    image_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decode image. File may be corrupted."
        )

    inspection_id = str(uuid.uuid4())
    original_filename = f"{inspection_id}_orig{ext}"
    annotated_filename = f"{inspection_id}_annotated{ext}"
    report_filename = f"{inspection_id}_report.pdf"

    original_path = str(settings.OUTPUTS_DIR / original_filename)
    annotated_path = str(settings.OUTPUTS_DIR / annotated_filename)
    report_path = str(settings.OUTPUTS_DIR / report_filename)

    # Save original image
    cv2.imwrite(original_path, image_bgr)

    try:
        # Run YOLO inference
        det_result = yolo_service.predict_image(
            image_bgr=image_bgr,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            imgsz=imgsz
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )

    # Save annotated image
    cv2.imwrite(annotated_path, det_result["annotated_bgr"])

    # Prepare database record
    inspection_data = {
        "id": inspection_id,
        "filename": annotated_filename,
        "original_filename": file.filename,
        "media_type": "image",
        "original_path": original_path,
        "annotated_path": annotated_path,
        "telemetry_csv_path": None,
        "width": det_result["width"],
        "height": det_result["height"],
        "duration_sec": None,
        "fps": None,
        "frames_processed": 1,
        "total_detections": det_result["total_detections"],
        "avg_confidence": det_result["avg_confidence"],
        "highest_severity": det_result["highest_severity"],
        "risk_score": det_result["risk"]["score"],
        "risk_level": det_result["risk"]["level"],
        "risk_band": det_result["risk"]["risk_band"],
        "advisory": det_result["risk"]["advisory"],
        "factors": det_result["risk"]["factors"],
        "class_counts": det_result["class_counts"],
        "severity_counts": det_result["severity_counts"],
        "detections": det_result["detections"],
        "frame_timeline": None,
        "inference_time_ms": det_result["inference_time_ms"]
    }

    record = InspectionRepository.create(inspection_data)

    # Generate PDF report in advance
    try:
        ReportService.generate_pdf(record, report_path)
    except Exception as e:
        # Don't fail the prediction if PDF generation hits an edge case
        pass

    return {
        "id": record["id"],
        "created_at": record["created_at"],
        "filename": record["filename"],
        "original_filename": record["original_filename"],
        "media_type": record["media_type"],
        "original_url": f"/api/outputs/{original_filename}",
        "annotated_url": f"/api/outputs/{annotated_filename}",
        "telemetry_csv_url": None,
        "report_pdf_url": f"/api/inspections/{record['id']}/report",
        "width": record["width"],
        "height": record["height"],
        "duration_sec": None,
        "fps": None,
        "frames_processed": 1,
        "total_detections": record["total_detections"],
        "avg_confidence": record["avg_confidence"],
        "highest_severity": record["highest_severity"],
        "risk": {
            "score": record["risk_score"],
            "level": record["risk_level"],
            "risk_band": record["risk_band"],
            "advisory": record["advisory"],
            "factors": record["factors"]
        },
        "class_counts": record["class_counts"],
        "severity_counts": record["severity_counts"],
        "detections": record["detections"],
        "frame_timeline": None,
        "inference_time_ms": record["inference_time_ms"]
    }

@router.post("/predict/video")
async def predict_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    conf_threshold: float = Form(settings.CONF_THRESHOLD_DEFAULT),
    iou_threshold: float = Form(settings.IOU_THRESHOLD_DEFAULT),
    sampling_step: int = Form(1),
    ema_alpha: float = Form(0.20)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format: '{ext}'. Supported formats: {', '.join(ALLOWED_VIDEO_EXTS)}"
        )

    # Check model readiness
    if not yolo_service.weights_loaded or yolo_service.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Trained model weights not found at '{settings.MODEL_PATH}'."
        )

    job_id = str(uuid.uuid4())
    inspection_id = str(uuid.uuid4())
    temp_video_filename = f"{job_id}_input{ext}"
    temp_video_path = str(settings.TEMP_DIR / temp_video_filename)

    # Save uploaded video file in chunks to disk
    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Initialize Job
    JobRepository.create(job_id=job_id)

    # Launch background job
    background_tasks.add_task(
        VideoService.process_video_job,
        job_id=job_id,
        input_video_path=temp_video_path,
        inspection_id=inspection_id,
        original_filename=file.filename,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold,
        frame_sampling_step=max(1, sampling_step),
        ema_alpha=ema_alpha
    )

    return {
        "job_id": job_id,
        "inspection_id": inspection_id,
        "status": "queued",
        "message": "Video inspection job queued for background processing."
    }

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = JobRepository.get_by_id(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found."
        )
    return job
