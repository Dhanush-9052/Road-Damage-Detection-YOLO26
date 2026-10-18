"""
SQLite Database manager for inspection records and asynchronous video processing jobs.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DATABASE_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Inspections Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        filename TEXT NOT NULL,
        media_type TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        original_path TEXT NOT NULL,
        annotated_path TEXT NOT NULL,
        telemetry_csv_path TEXT,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        duration_sec REAL,
        fps REAL,
        frames_processed INTEGER,
        total_detections INTEGER NOT NULL,
        avg_confidence REAL NOT NULL,
        highest_severity TEXT NOT NULL,
        risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        risk_band TEXT NOT NULL,
        advisory TEXT NOT NULL,
        factors_json TEXT NOT NULL,
        class_counts_json TEXT NOT NULL,
        severity_counts_json TEXT NOT NULL,
        detections_json TEXT NOT NULL,
        frame_timeline_json TEXT,
        inference_time_ms REAL NOT NULL
    )
    """)
    
    # Jobs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        progress REAL NOT NULL DEFAULT 0.0,
        current_frame INTEGER DEFAULT 0,
        total_frames INTEGER DEFAULT 0,
        error_message TEXT,
        inspection_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

class InspectionRepository:
    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
        INSERT INTO inspections (
            id, created_at, filename, media_type, original_filename,
            original_path, annotated_path, telemetry_csv_path,
            width, height, duration_sec, fps, frames_processed,
            total_detections, avg_confidence, highest_severity,
            risk_score, risk_level, risk_band, advisory,
            factors_json, class_counts_json, severity_counts_json,
            detections_json, frame_timeline_json, inference_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["id"],
            data.get("created_at", datetime.now().isoformat()),
            data["filename"],
            data["media_type"],
            data.get("original_filename", data["filename"]),
            data.get("original_path", ""),
            data["annotated_path"],
            data.get("telemetry_csv_path"),
            data.get("width", 0),
            data.get("height", 0),
            data.get("duration_sec"),
            data.get("fps"),
            data.get("frames_processed"),
            data["total_detections"],
            data["avg_confidence"],
            data["highest_severity"],
            data["risk_score"],
            data["risk_level"],
            data["risk_band"],
            data["advisory"],
            json.dumps(data.get("factors", [])),
            json.dumps(data.get("class_counts", {})),
            json.dumps(data.get("severity_counts", {})),
            json.dumps(data.get("detections", [])),
            json.dumps(data.get("frame_timeline", [])) if data.get("frame_timeline") else None,
            data.get("inference_time_ms", 0.0)
        ))
        
        conn.commit()
        conn.close()
        return InspectionRepository.get_by_id(data["id"])

    @staticmethod
    def get_by_id(inspection_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inspections WHERE id = ?", (inspection_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return InspectionRepository._format_row(row)

    @staticmethod
    def list_all(
        limit: int = 100,
        offset: int = 0,
        media_type: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM inspections WHERE 1=1"
        params = []
        
        if media_type:
            query += " AND media_type = ?"
            params.append(media_type)
        if severity:
            query += " AND highest_severity = ?"
            params.append(severity)
        if search:
            query += " AND (filename LIKE ? OR original_filename LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
            
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [InspectionRepository._format_row(r) for r in rows]

    @staticmethod
    def count(media_type: Optional[str] = None, severity: Optional[str] = None, search: Optional[str] = None) -> int:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT COUNT(*) FROM inspections WHERE 1=1"
        params = []
        if media_type:
            query += " AND media_type = ?"
            params.append(media_type)
        if severity:
            query += " AND highest_severity = ?"
            params.append(severity)
        if search:
            query += " AND (filename LIKE ? OR original_filename LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        cursor.execute(query, params)
        cnt = cursor.fetchone()[0]
        conn.close()
        return cnt

    @staticmethod
    def delete(inspection_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM inspections WHERE id = ?", (inspection_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    @staticmethod
    def get_summary_stats() -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM inspections")
        total_inspections = cursor.fetchone()[0]
        
        if total_inspections == 0:
            conn.close()
            return {
                "total_inspections": 0,
                "total_detections": 0,
                "high_severity_detections": 0,
                "medium_severity_detections": 0,
                "low_severity_detections": 0,
                "avg_confidence": 0.0,
                "image_inspections": 0,
                "video_inspections": 0,
                "avg_risk_score": 0.0,
                "class_distribution": {},
                "severity_distribution": {"Low": 0, "Medium": 0, "High": 0},
                "risk_distribution": {"Low": 0, "Medium": 0, "High": 0}
            }
            
        cursor.execute("SELECT SUM(total_detections), AVG(avg_confidence), AVG(risk_score) FROM inspections")
        sum_det, avg_conf, avg_risk = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM inspections WHERE media_type = 'image'")
        img_cnt = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM inspections WHERE media_type = 'video'")
        vid_cnt = cursor.fetchone()[0]
        
        # Accumulate class counts and severity counts
        cursor.execute("SELECT class_counts_json, severity_counts_json, risk_band FROM inspections")
        all_rows = cursor.fetchall()
        conn.close()
        
        class_dist = {}
        sev_dist = {"Low": 0, "Medium": 0, "High": 0}
        risk_dist = {"Low": 0, "Medium": 0, "High": 0}
        
        for r in all_rows:
            try:
                c_counts = json.loads(r[0])
                for k, v in c_counts.items():
                    class_dist[k] = class_dist.get(k, 0) + v
            except Exception:
                pass
            try:
                s_counts = json.loads(r[1])
                for k, v in s_counts.items():
                    sev_dist[k] = sev_dist.get(k, 0) + v
            except Exception:
                pass
            band = r[2]
            if band in risk_dist:
                risk_dist[band] += 1
                
        return {
            "total_inspections": total_inspections,
            "total_detections": int(sum_det or 0),
            "high_severity_detections": sev_dist.get("High", 0),
            "medium_severity_detections": sev_dist.get("Medium", 0),
            "low_severity_detections": sev_dist.get("Low", 0),
            "avg_confidence": round(float(avg_conf or 0.0), 3),
            "image_inspections": img_cnt,
            "video_inspections": vid_cnt,
            "avg_risk_score": round(float(avg_risk or 0.0), 1),
            "class_distribution": class_dist,
            "severity_distribution": sev_dist,
            "risk_distribution": risk_dist
        }

    @staticmethod
    def _format_row(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["factors"] = json.loads(d.pop("factors_json", "[]"))
        d["class_counts"] = json.loads(d.pop("class_counts_json", "{}"))
        d["severity_counts"] = json.loads(d.pop("severity_counts_json", "{}"))
        d["detections"] = json.loads(d.pop("detections_json", "[]"))
        timeline = d.pop("frame_timeline_json", None)
        d["frame_timeline"] = json.loads(timeline) if timeline else None
        return d

class JobRepository:
    @staticmethod
    def create(job_id: str, total_frames: int = 0) -> Dict[str, Any]:
        now = datetime.now().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO jobs (job_id, status, progress, current_frame, total_frames, created_at, updated_at)
        VALUES (?, 'queued', 0.0, 0, ?, ?, ?)
        """, (job_id, total_frames, now, now))
        conn.commit()
        conn.close()
        return JobRepository.get_by_id(job_id)

    @staticmethod
    def update(
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[float] = None,
        current_frame: Optional[int] = None,
        total_frames: Optional[int] = None,
        error_message: Optional[str] = None,
        inspection_id: Optional[str] = None
    ):
        conn = get_db_connection()
        cursor = conn.cursor()
        updates = ["updated_at = ?"]
        params = [datetime.now().isoformat()]
        
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if progress is not None:
            updates.append("progress = ?")
            params.append(progress)
        if current_frame is not None:
            updates.append("current_frame = ?")
            params.append(current_frame)
        if total_frames is not None:
            updates.append("total_frames = ?")
            params.append(total_frames)
        if error_message is not None:
            updates.append("error_message = ?")
            params.append(error_message)
        if inspection_id is not None:
            updates.append("inspection_id = ?")
            params.append(inspection_id)
            
        params.append(job_id)
        query = f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()

    @staticmethod
    def get_by_id(job_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)
