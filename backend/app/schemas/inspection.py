"""
Pydantic Schemas for RoadVision AI API.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class DetectionItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2] pixel coordinates")
    relative_area: float
    severity_score: float
    severity_level: str
    frame_number: Optional[int] = None

class RiskAssessment(BaseModel):
    score: float
    level: str
    risk_band: str
    advisory: str
    factors: List[str]

class InspectionResponse(BaseModel):
    id: str
    created_at: str
    filename: str
    original_filename: str
    media_type: str
    original_url: str
    annotated_url: str
    telemetry_csv_url: Optional[str] = None
    report_pdf_url: str
    width: int
    height: int
    duration_sec: Optional[float] = None
    fps: Optional[float] = None
    frames_processed: Optional[int] = None
    total_detections: int
    avg_confidence: float
    highest_severity: str
    risk: RiskAssessment
    class_counts: Dict[str, int]
    severity_counts: Dict[str, int]
    detections: List[DetectionItem] = []
    frame_timeline: Optional[List[Dict[str, Any]]] = None
    inference_time_ms: float

class InspectionListItem(BaseModel):
    id: str
    created_at: str
    filename: str
    original_filename: str
    media_type: str
    annotated_url: str
    total_detections: int
    highest_severity: str
    risk_score: float
    risk_level: str
    risk_band: str
    avg_confidence: float

class ModelInfoResponse(BaseModel):
    model_name: str
    model_filename: str = Field(..., description="Name of the model file loaded, e.g. best.pt")
    model_path: str = Field(..., description="Absolute resolved path of the model file loaded")
    device: str
    classes: Dict[int, str]
    num_classes: int
    weights_loaded: bool
    architecture: str
    benchmark_metrics: Dict[str, Any]

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    current_frame: int
    total_frames: int
    error_message: Optional[str] = None
    inspection_id: Optional[str] = None

class DashboardSummary(BaseModel):
    total_inspections: int
    total_detections: int
    high_severity_detections: int
    medium_severity_detections: int
    low_severity_detections: int
    avg_confidence: float
    image_inspections: int
    video_inspections: int
    avg_risk_score: float
    class_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]
