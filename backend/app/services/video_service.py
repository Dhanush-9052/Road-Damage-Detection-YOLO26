"""
Video Processing Service for Road Damage Telemetry & Analysis.
Performs frame sampling, YOLO detection, HUD telemetry overlay, EMA risk smoothing, and telemetry logging.
"""

import os
import sys
import cv2
import time
import shutil
import logging
import subprocess
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

from app.core.config import settings
from app.core.severity import calculate_instance_severity, calculate_aggregate_risk
from app.services.yolo_service import yolo_service
from app.database.db import JobRepository, InspectionRepository

logger = logging.getLogger("roadvision.video")

class VideoService:
    @staticmethod
    def draw_telemetry_hud(
        frame: np.ndarray,
        raw_risk: float,
        smoothed_risk: float,
        risk_level: str,
        defect_counts: Dict[str, int],
        severity_counts: Dict[str, int],
        frame_idx: int = 0,
        fps: float = 30.0
    ) -> np.ndarray:
        h, w = frame.shape[:2]
        hud_h = max(70, int(h * 0.11))
        overlay = frame.copy()
        
        # Dark HUD banner
        cv2.rectangle(overlay, (0, 0), (w, hud_h), (20, 24, 30), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        
        # Status colors
        if smoothed_risk <= 30.0:
            status_text = "STATUS: SAFE"
            badge_bgr = (113, 204, 46)  # Green
        elif smoothed_risk <= 70.0:
            status_text = "STATUS: CAUTION"
            badge_bgr = (18, 156, 243)  # Orange
        else:
            status_text = "STATUS: DANGER"
            badge_bgr = (60, 76, 231)   # Red
            
        cv2.line(frame, (0, hud_h), (w, hud_h), badge_bgr, 2)
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Left Info
        time_sec = frame_idx / max(fps, 1.0)
        cv2.putText(frame, "ROADVISION AI - YOLO26 INSPECTION", (18, 26), font, 0.60, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Frame: {frame_idx:05d} | Time: {time_sec:05.1f}s | FPS: {fps:.1f}", (18, 52), font, 0.42, (180, 190, 200), 1, cv2.LINE_AA)
        
        # Center Risk Gauge
        gauge_x = int(w * 0.35)
        gauge_w = int(w * 0.28)
        cv2.rectangle(frame, (gauge_x, 28), (gauge_x + gauge_w, 46), (50, 55, 65), -1)
        fill_w = int((smoothed_risk / 100.0) * gauge_w)
        if fill_w > 0:
            cv2.rectangle(frame, (gauge_x, 28), (gauge_x + fill_w, 46), badge_bgr, -1)
        cv2.rectangle(frame, (gauge_x, 28), (gauge_x + gauge_w, 46), (120, 130, 140), 1)
        cv2.putText(frame, f"ROAD RISK: {smoothed_risk:.1f}/100", (gauge_x, 20), font, 0.46, (240, 240, 240), 1, cv2.LINE_AA)
        
        # Status Badge
        badge_x = gauge_x + gauge_w + 14
        badge_w = 150
        cv2.rectangle(frame, (badge_x, 18), (badge_x + badge_w, 48), badge_bgr, -1)
        cv2.putText(frame, status_text, (badge_x + 8, 38), font, 0.42, (255, 255, 255), 2, cv2.LINE_AA)
        
        # Right defect summary
        tally_x = int(w * 0.80)
        total_def = sum(defect_counts.values())
        cv2.putText(frame, f"Defects: {total_def}", (tally_x, 24), font, 0.52, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(
            frame,
            f"H:{severity_counts.get('High', 0)} M:{severity_counts.get('Medium', 0)} L:{severity_counts.get('Low', 0)}",
            (tally_x, 48),
            font,
            0.44,
            (200, 215, 230),
            1,
            cv2.LINE_AA
        )
        return frame

    @classmethod
    def process_video_job(
        cls,
        job_id: str,
        input_video_path: str,
        inspection_id: str,
        original_filename: str,
        conf_threshold: float = 0.20,
        iou_threshold: float = 0.45,
        frame_sampling_step: int = 1,
        ema_alpha: float = 0.20
    ):
        try:
            JobRepository.update(job_id, status="processing", progress=1.0)
            
            cap = cv2.VideoCapture(input_video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {input_video_path}")
                
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration_sec = total_frames / max(fps, 1.0)
            
            JobRepository.update(job_id, total_frames=total_frames)

            annotated_filename = f"{inspection_id}_annotated.mp4"
            telemetry_filename = f"{inspection_id}_telemetry.csv"
            
            annotated_path = str(settings.OUTPUTS_DIR / annotated_filename)
            telemetry_path = str(settings.OUTPUTS_DIR / telemetry_filename)
            temp_raw_path = str(settings.TEMP_DIR / f"{inspection_id}_raw.mp4")

            # Output video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out_writer = cv2.VideoWriter(temp_raw_path, fourcc, fps, (w, h))

            class_names = yolo_service.class_names or {}
            class_totals = {name: 0 for name in class_names.values()}
            severity_totals = {"Low": 0, "Medium": 0, "High": 0}
            
            records = []
            frame_timeline = []
            frame_idx = 0
            processed_count = 0
            current_smoothed_risk = 0.0
            all_confidences = []
            
            last_metrics = None
            t_start = time.perf_counter()

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Frame sampling: run full YOLO detection on sampled frames, reuse previous on skipped
                is_sampled = (frame_idx % frame_sampling_step == 0)
                
                if is_sampled:
                    processed_count += 1
                    det_result = yolo_service.predict_image(
                        image_bgr=frame,
                        conf_threshold=conf_threshold,
                        iou_threshold=iou_threshold
                    )
                    last_metrics = det_result
                    
                    raw_risk = det_result["risk"]["score"]
                    if frame_idx == 0:
                        current_smoothed_risk = raw_risk
                    else:
                        current_smoothed_risk = (ema_alpha * raw_risk) + ((1.0 - ema_alpha) * current_smoothed_risk)
                    current_smoothed_risk = float(np.clip(current_smoothed_risk, 0.0, 100.0))
                    
                    # Accumulate totals
                    for cls_name, cnt in det_result["class_counts"].items():
                        class_totals[cls_name] = class_totals.get(cls_name, 0) + cnt
                    for s_cat, cnt in det_result["severity_counts"].items():
                        severity_totals[s_cat] = severity_totals.get(s_cat, 0) + cnt
                    for d in det_result["detections"]:
                        all_confidences.append(d["confidence"])
                        
                    current_annotated = det_result["annotated_bgr"]
                else:
                    # Non-sampled frame: use raw frame or last annotated overlay
                    current_annotated = frame.copy()
                    raw_risk = last_metrics["risk"]["score"] if last_metrics else 0.0

                risk_level = "Safe (Low Risk)" if current_smoothed_risk <= 30.0 else (
                    "Caution (Moderate Risk)" if current_smoothed_risk <= 70.0 else "Danger (Critical Risk)"
                )

                # Draw telemetry HUD
                hud_frame = cls.draw_telemetry_hud(
                    frame=current_annotated,
                    raw_risk=raw_risk,
                    smoothed_risk=current_smoothed_risk,
                    risk_level=risk_level,
                    defect_counts=last_metrics["class_counts"] if last_metrics else {},
                    severity_counts=last_metrics["severity_counts"] if last_metrics else {},
                    frame_idx=frame_idx,
                    fps=fps
                )

                out_writer.write(hud_frame)

                timestamp_sec = round(frame_idx / max(fps, 1.0), 2)
                row = {
                    "Frame": frame_idx,
                    "Timestamp_Sec": timestamp_sec,
                    "Total_Defects": last_metrics["total_detections"] if last_metrics else 0,
                    "Raw_Risk_Score": round(raw_risk, 2),
                    "Smoothed_Risk_Score": round(current_smoothed_risk, 2),
                    "Risk_Level": risk_level,
                    "High_Severity": last_metrics["severity_counts"].get("High", 0) if last_metrics else 0,
                    "Medium_Severity": last_metrics["severity_counts"].get("Medium", 0) if last_metrics else 0,
                    "Low_Severity": last_metrics["severity_counts"].get("Low", 0) if last_metrics else 0,
                }
                for cls_name in class_names.values():
                    row[cls_name] = last_metrics["class_counts"].get(cls_name, 0) if last_metrics else 0
                records.append(row)

                if is_sampled or frame_idx % 15 == 0:
                    frame_timeline.append({
                        "frame": frame_idx,
                        "time_sec": timestamp_sec,
                        "risk_score": round(current_smoothed_risk, 1),
                        "defect_count": last_metrics["total_detections"] if last_metrics else 0,
                        "high_count": last_metrics["severity_counts"].get("High", 0) if last_metrics else 0
                    })

                frame_idx += 1
                if total_frames > 0 and frame_idx % 10 == 0:
                    prog = min(95.0, round((frame_idx / total_frames) * 95.0, 1))
                    JobRepository.update(job_id, progress=prog, current_frame=frame_idx)

            cap.release()
            out_writer.release()
            
            inference_time_ms = round((time.perf_counter() - t_start) * 1000, 2)

            # Export Telemetry CSV
            df = pd.DataFrame(records)
            df.to_csv(telemetry_path, index=False)

            # Convert to H.264 MP4 using ffmpeg if available, otherwise move temp_raw
            ffmpeg_exe = shutil.which("ffmpeg")
            if not ffmpeg_exe:
                try:
                    import imageio_ffmpeg
                    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
                except Exception:
                    pass
            if not ffmpeg_exe:
                scripts_dir = os.path.dirname(sys.executable)
                candidate = os.path.join(scripts_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
                if os.path.exists(candidate):
                    ffmpeg_exe = candidate

            converted_ok = False
            if ffmpeg_exe:
                try:
                    cmd = [
                        ffmpeg_exe, "-y", "-i", temp_raw_path,
                        "-vcodec", "libx264", "-crf", "23", "-pix_fmt", "yuv420p",
                        annotated_path
                    ]
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                    converted_ok = True
                    if os.path.exists(temp_raw_path):
                        os.remove(temp_raw_path)
                except Exception as fe:
                    logger.warning(f"ffmpeg conversion failed: {fe}. Falling back to raw mp4v.")
            
            if not converted_ok:
                if os.path.exists(temp_raw_path):
                    if os.path.exists(annotated_path):
                        os.remove(annotated_path)
                    os.rename(temp_raw_path, annotated_path)

            # Highest severity observed
            if severity_totals["High"] > 0:
                highest_sev = "High"
            elif severity_totals["Medium"] > 0:
                highest_sev = "Medium"
            elif severity_totals["Low"] > 0:
                highest_sev = "Low"
            else:
                highest_sev = "None"

            # Aggregate risk calculation for overall video
            overall_risk_score = round(float(df["Smoothed_Risk_Score"].max()), 1) if not df.empty else 0.0
            overall_risk_data = calculate_aggregate_risk(
                [0.8 if highest_sev == "High" else (0.5 if highest_sev == "Medium" else 0.2)] if sum(severity_totals.values()) > 0 else [],
                class_totals
            )
            overall_risk_data["score"] = overall_risk_score
            if overall_risk_score <= 30.0:
                overall_risk_data["level"] = "Safe (Low Risk)"
                overall_risk_data["risk_band"] = "Low"
            elif overall_risk_score <= 70.0:
                overall_risk_data["level"] = "Caution (Moderate Risk)"
                overall_risk_data["risk_band"] = "Medium"
            else:
                overall_risk_data["level"] = "Danger (Critical Risk)"
                overall_risk_data["risk_band"] = "High"

            avg_conf = float(np.mean(all_confidences)) if all_confidences else 0.0

            # Create Inspection Record in Database
            inspection_data = {
                "id": inspection_id,
                "filename": os.path.basename(annotated_path),
                "original_filename": original_filename,
                "media_type": "video",
                "original_path": input_video_path,
                "annotated_path": annotated_path,
                "telemetry_csv_path": telemetry_path,
                "width": w,
                "height": h,
                "duration_sec": round(duration_sec, 2),
                "fps": round(fps, 2),
                "frames_processed": processed_count,
                "total_detections": sum(class_totals.values()),
                "avg_confidence": round(avg_conf, 4),
                "highest_severity": highest_sev,
                "risk_score": overall_risk_score,
                "risk_level": overall_risk_data["level"],
                "risk_band": overall_risk_data["risk_band"],
                "advisory": overall_risk_data["advisory"],
                "factors": overall_risk_data["factors"],
                "class_counts": class_totals,
                "severity_counts": severity_totals,
                "detections": [],
                "frame_timeline": frame_timeline,
                "inference_time_ms": inference_time_ms
            }
            InspectionRepository.create(inspection_data)

            JobRepository.update(
                job_id,
                status="completed",
                progress=100.0,
                current_frame=frame_idx,
                inspection_id=inspection_id
            )
            logger.info(f"Video job {job_id} successfully completed for inspection {inspection_id}!")

        except Exception as e:
            logger.error(f"Video processing failed for job {job_id}: {e}", exc_info=True)
            JobRepository.update(job_id, status="failed", error_message=str(e))
