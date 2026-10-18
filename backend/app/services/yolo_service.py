"""
YOLO Inference Service for Road Damage Detection.
Loads trained weights once at application startup and handles single-image detection.
"""

import os
import time
import logging
from typing import Dict, List, Tuple, Any, Optional
import cv2
import numpy as np
import torch
from ultralytics import YOLO

from app.core.config import settings
from app.core.severity import calculate_instance_severity, calculate_aggregate_risk

logger = logging.getLogger("roadvision.yolo")

class YOLOService:
    _instance: Optional["YOLOService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(YOLOService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.device = "cuda" if torch.cuda.is_available() else "cpu"
            cls._instance.class_names = {}
            cls._instance.weights_loaded = False
            cls._instance.weights_path = os.path.abspath(settings.MODEL_PATH)
            cls._instance.model_filename = os.path.basename(cls._instance.weights_path)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        weights_path = self.weights_path
        logger.info(f"[YOLOService] Targeting model weights: {self.model_filename}")
        logger.info(f"[YOLOService] Resolved absolute path: {weights_path}")
        
        if not os.path.exists(weights_path):
            # Check models directory fallback
            alt_path = os.path.abspath(os.path.join(os.path.dirname(weights_path), "best.pt"))
            if os.path.exists(alt_path):
                weights_path = alt_path
                self.weights_path = alt_path
                self.model_filename = os.path.basename(alt_path)

        if os.path.exists(weights_path):
            try:
                logger.info(f"[YOLOService] Loading trained YOLO weights from '{weights_path}' onto {self.device}...")
                self.model = YOLO(weights_path)
                self.model.to(self.device)
                self.weights_loaded = True
                self.class_names = self.model.names if hasattr(self.model, "names") else {}
                logger.info(f"[YOLOService] Successfully loaded '{self.model_filename}' ({len(self.class_names)} classes): {self.class_names}")
            except Exception as e:
                logger.error(f"[YOLOService] Failed to load weights from {weights_path}: {e}")
                self.model = None
                self.weights_loaded = False
        else:
            logger.warning(f"[YOLOService] Weights file not found at {weights_path}. Model will be marked as not loaded.")
            self.model = None
            self.weights_loaded = False

    def get_info(self) -> Dict[str, Any]:
        return {
            "model_name": "YOLO26-RoadDamage (Latest best.pt)",
            "model_filename": getattr(self, "model_filename", "best.pt"),
            "model_path": getattr(self, "weights_path", settings.MODEL_PATH),
            "device": self.device,
            "classes": self.class_names,
            "num_classes": len(self.class_names),
            "weights_loaded": self.weights_loaded,
            "architecture": "Ultralytics YOLO26s (Decoupled Head, C3k2, SPPF)",
            "benchmark_metrics": {
                "dataset": "Multisource Road Defect Dataset (MRDD 2026)",
                "test_images": 1863,
                "precision": 0.9523,
                "recall": 0.9087,
                "map50": 0.9545,
                "map50_95": 0.6098,
                "classes": [
                    {"name": "Pothole", "precision": 0.9617, "recall": 0.9374, "map50": 0.9705, "map50_95": 0.5920},
                    {"name": "Crack", "precision": 0.9371, "recall": 0.8776, "map50": 0.9312, "map50_95": 0.5811},
                    {"name": "Rut", "precision": 0.9345, "recall": 0.8880, "map50": 0.9387, "map50_95": 0.6152},
                    {"name": "Abscission", "precision": 0.9348, "recall": 0.8943, "map50": 0.9410, "map50_95": 0.5863},
                    {"name": "Undulation", "precision": 0.9767, "recall": 0.8911, "map50": 0.9586, "map50_95": 0.6280},
                    {"name": "Repair", "precision": 0.9689, "recall": 0.9637, "map50": 0.9867, "map50_95": 0.6564}
                ]
            }
        }

    def predict_image(
        self,
        image_bgr: np.ndarray,
        conf_threshold: float = 0.20,
        iou_threshold: float = 0.45,
        imgsz: int = 640
    ) -> Dict[str, Any]:
        if not self.weights_loaded or self.model is None:
            raise RuntimeError(
                f"Trained model weights not found at '{settings.MODEL_PATH}'. "
                "Please ensure best.pt is placed in backend/models/best.pt."
            )

        h, w = image_bgr.shape[:2]
        t0 = time.perf_counter()

        # Run inference through the YOLO model
        results = self.model.predict(
            source=image_bgr,
            conf=conf_threshold,
            iou=iou_threshold,
            imgsz=imgsz,
            device=self.device,
            verbose=False
        )[0]

        inference_time_ms = round((time.perf_counter() - t0) * 1000, 2)

        annotated_bgr = image_bgr.copy()
        detections = []
        severities = []
        class_counts = {name: 0 for name in self.class_names.values()}
        severity_counts = {"Low": 0, "Medium": 0, "High": 0}

        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            confs = results.boxes.conf.cpu().numpy()
            clss = results.boxes.cls.cpu().numpy().astype(int)

            for i in range(len(boxes)):
                box = boxes[i].tolist()
                conf = float(confs[i])
                cls_id = int(clss[i])
                cls_name = self.class_names.get(cls_id, f"class_{cls_id}")

                class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

                # Calculate severity per detection instance
                sev_score, sev_cat, rel_area = calculate_instance_severity(
                    class_name=cls_name,
                    confidence=conf,
                    bbox_xyxy=box,
                    frame_width=w,
                    frame_height=h
                )

                severities.append(sev_score)
                severity_counts[sev_cat] = severity_counts.get(sev_cat, 0) + 1

                det_item = {
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": [round(coord, 1) for coord in box],
                    "relative_area": round(rel_area, 6),
                    "severity_score": round(sev_score, 3),
                    "severity_level": sev_cat
                }
                detections.append(det_item)

                # Draw bounding box and label badge on annotated image
                color_bgr = settings.SEVERITY_COLORS_BGR.get(sev_cat, (113, 204, 46))
                x1, y1, x2, y2 = [int(v) for v in box]
                
                # Draw box border
                cv2.rectangle(annotated_bgr, (x1, y1), (x2, y2), color_bgr, 2)
                
                # Label tag
                tag = f"{cls_name} {conf:.0%} [{sev_cat.upper()} S={sev_score:.2f}]"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.45
                thickness = 1
                (tw, th), baseline = cv2.getTextSize(tag, font, font_scale, thickness)
                
                # Tag background rectangle
                tag_y1 = max(0, y1 - th - 8)
                tag_y2 = y1
                tag_x2 = min(w, x1 + tw + 8)
                cv2.rectangle(annotated_bgr, (x1, tag_y1), (tag_x2, tag_y2), color_bgr, -1)
                cv2.putText(
                    annotated_bgr,
                    tag,
                    (x1 + 4, tag_y2 - 4),
                    font,
                    font_scale,
                    (255, 255, 255),
                    thickness,
                    cv2.LINE_AA
                )

        # Risk calculation
        risk_data = calculate_aggregate_risk(severities, class_counts)

        # Determine highest severity
        if severity_counts["High"] > 0:
            highest_sev = "High"
        elif severity_counts["Medium"] > 0:
            highest_sev = "Medium"
        elif severity_counts["Low"] > 0:
            highest_sev = "Low"
        else:
            highest_sev = "None"

        avg_conf = float(np.mean([d["confidence"] for d in detections])) if detections else 0.0

        return {
            "annotated_bgr": annotated_bgr,
            "width": w,
            "height": h,
            "detections": detections,
            "total_detections": len(detections),
            "class_counts": class_counts,
            "severity_counts": severity_counts,
            "highest_severity": highest_sev,
            "avg_confidence": round(avg_conf, 4),
            "risk": risk_data,
            "inference_time_ms": inference_time_ms
        }

# Global singleton
yolo_service = YOLOService()
