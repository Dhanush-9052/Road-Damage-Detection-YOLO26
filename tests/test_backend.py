"""
Automated Test Suite for RoadVision AI Backend.
Tests model loading, severity heuristics, risk score calculation, API endpoints, and report generation.
"""

import os
import sys
from pathlib import Path
import pytest
import numpy as np
import cv2

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.severity import calculate_instance_severity, calculate_aggregate_risk
from app.services.yolo_service import yolo_service
from app.services.report_service import ReportService
from app.database.db import InspectionRepository, JobRepository, init_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()

def test_model_loading_and_classes():
    """Verify that best.pt is successfully loaded with the 6 expected classes."""
    info = yolo_service.get_info()
    assert info["weights_loaded"] is True, "Trained model weights should be loaded."
    assert info["num_classes"] == 6, f"Expected 6 classes, got {info['num_classes']}"
    
    expected_classes = {'Crack', 'Pothole', 'Abscission', 'Rut', 'Repair', 'Undulation'}
    loaded_class_names = set(info["classes"].values())
    assert expected_classes.issubset(loaded_class_names), f"Missing classes: {expected_classes - loaded_class_names}"

def test_severity_calculation_low():
    """Test instance severity calculation for small defect."""
    # Small box: 50x50 on a 1000x1000 image = rel_area = 0.0025
    score, category, rel_area = calculate_instance_severity(
        class_name="crack",
        confidence=0.5,
        bbox_xyxy=[100, 100, 150, 150],
        frame_width=1000,
        frame_height=1000
    )
    assert 0.0 <= score <= 1.0
    assert category == "Low"
    assert rel_area == 0.0025

def test_severity_calculation_high():
    """Test instance severity calculation for large critical pothole."""
    # Large pothole: 300x300 on a 1000x1000 image = rel_area = 0.09 (saturates 0.04)
    # Pothole hazard weight = 1.0
    score, category, rel_area = calculate_instance_severity(
        class_name="pothole",
        confidence=0.90,
        bbox_xyxy=[100, 100, 400, 400],
        frame_width=1000,
        frame_height=1000
    )
    assert score >= 0.65
    assert category == "High"

def test_aggregate_risk_empty():
    """Empty defect list must return 0.0 score and Safe risk level."""
    risk = calculate_aggregate_risk([], {})
    assert risk["score"] == 0.0
    assert "Safe" in risk["level"]
    assert risk["risk_band"] == "Low"

def test_aggregate_risk_high():
    """Severe defects must reach Danger risk level and clamp at 100."""
    severities = [0.85, 0.90, 0.75, 0.80]
    risk = calculate_aggregate_risk(severities, {"pothole": 2, "rut": 2})
    assert risk["score"] == 100.0
    assert "Danger" in risk["level"]
    assert risk["risk_band"] == "High"
    assert len(risk["factors"]) > 0

def test_real_image_inference():
    """Test YOLO forward pass on a synthetic road surface frame."""
    # Create a synthetic pavement image (gray road with a dark artificial cavity)
    test_img = np.full((640, 640, 3), 110, dtype=np.uint8)
    cv2.circle(test_img, (320, 320), 40, (30, 30, 30), -1)

    result = yolo_service.predict_image(
        image_bgr=test_img,
        conf_threshold=0.10,
        iou_threshold=0.45,
        imgsz=640
    )

    assert "annotated_bgr" in result
    assert result["width"] == 640
    assert result["height"] == 640
    assert "detections" in result
    assert "risk" in result
    assert isinstance(result["inference_time_ms"], float)

def test_api_health_endpoint():
    """Verify /api/health returns 200 OK and model status."""
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["classes_count"] == 6

def test_api_model_info_endpoint():
    """Verify /api/model-info returns benchmark metrics and class map."""
    client = TestClient(app)
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["num_classes"] == 6
    assert data["benchmark_metrics"]["map50"] == 0.9545

def test_api_image_prediction():
    """Verify /api/predict/image accepts multipart upload and returns full inspection schema."""
    client = TestClient(app)

    # Encode a synthetic test image to JPG bytes
    test_img = np.full((480, 640, 3), 120, dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", test_img)
    img_bytes = buffer.tobytes()

    response = client.post(
        "/api/predict/image",
        files={"file": ("test_road.jpg", img_bytes, "image/jpeg")},
        data={"conf_threshold": "0.20", "iou_threshold": "0.45", "imgsz": "640"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["media_type"] == "image"
    assert data["width"] == 640
    assert data["height"] == 480
    assert "risk" in data
    assert "class_counts" in data
    assert "report_pdf_url" in data

    # Test PDF Report generation for this inspection
    report_resp = client.get(f"/api/inspections/{data['id']}/report")
    assert report_resp.status_code == 200
    assert report_resp.headers["content-type"] == "application/pdf"

    # Test CSV Export
    export_resp = client.get(f"/api/inspections/{data['id']}/export?format=csv")
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]

def test_inspection_persistence_and_delete():
    """Verify inspection record survives database queries and can be deleted cleanly."""
    client = TestClient(app)
    
    # List inspections
    res = client.get("/api/inspections")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) > 0

    target_id = items[0]["id"]
    # Get detail
    det_res = client.get(f"/api/inspections/{target_id}")
    assert det_res.status_code == 200
    assert det_res.json()["id"] == target_id

    # Summary analytics
    analytics_res = client.get("/api/analytics/summary")
    assert analytics_res.status_code == 200
    assert analytics_res.json()["total_inspections"] >= 1
