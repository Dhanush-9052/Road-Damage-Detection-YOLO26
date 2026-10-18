"""
Inspection History, Detail, Delete, and Report Export Endpoints.
"""

import os
import io
import csv
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from typing import Optional

from app.database.db import InspectionRepository
from app.services.report_service import ReportService
from app.schemas.inspection import InspectionResponse
from app.core.config import settings

router = APIRouter(prefix="/inspections", tags=["Inspections"])

@router.get("")
async def list_inspections(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    media_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    total = InspectionRepository.count(media_type=media_type, severity=severity, search=search)
    records = InspectionRepository.list_all(
        limit=limit,
        offset=offset,
        media_type=media_type,
        severity=severity,
        search=search
    )
    
    formatted = []
    for r in records:
        orig_name = os.path.basename(r.get("original_path", "")) if r.get("original_path") else r["filename"]
        formatted.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "filename": r["filename"],
            "original_filename": r["original_filename"],
            "media_type": r["media_type"],
            "original_url": f"/api/outputs/{orig_name}",
            "annotated_url": f"/api/outputs/{r['filename']}",
            "total_detections": r["total_detections"],
            "highest_severity": r["highest_severity"],
            "risk_score": r["risk_score"],
            "risk_level": r["risk_level"],
            "risk_band": r["risk_band"],
            "avg_confidence": r["avg_confidence"]
        })
        
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": formatted
    }

@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(inspection_id: str):
    r = InspectionRepository.get_by_id(inspection_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found."
        )
    
    orig_name = os.path.basename(r.get("original_path", "")) if r.get("original_path") else r["filename"]
    csv_name = os.path.basename(r.get("telemetry_csv_path", "")) if r.get("telemetry_csv_path") else None

    return {
        "id": r["id"],
        "created_at": r["created_at"],
        "filename": r["filename"],
        "original_filename": r["original_filename"],
        "media_type": r["media_type"],
        "original_url": f"/api/outputs/{orig_name}",
        "annotated_url": f"/api/outputs/{r['filename']}",
        "telemetry_csv_url": f"/api/outputs/{csv_name}" if csv_name else None,
        "report_pdf_url": f"/api/inspections/{r['id']}/report",
        "width": r["width"],
        "height": r["height"],
        "duration_sec": r.get("duration_sec"),
        "fps": r.get("fps"),
        "frames_processed": r.get("frames_processed"),
        "total_detections": r["total_detections"],
        "avg_confidence": r["avg_confidence"],
        "highest_severity": r["highest_severity"],
        "risk": {
            "score": r["risk_score"],
            "level": r["risk_level"],
            "risk_band": r["risk_band"],
            "advisory": r["advisory"],
            "factors": r["factors"]
        },
        "class_counts": r["class_counts"],
        "severity_counts": r["severity_counts"],
        "detections": r["detections"],
        "frame_timeline": r.get("frame_timeline"),
        "inference_time_ms": r["inference_time_ms"]
    }

@router.delete("/{inspection_id}")
async def delete_inspection(inspection_id: str):
    r = InspectionRepository.get_by_id(inspection_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found."
        )

    # Delete physical files
    for key in ["annotated_path", "original_path", "telemetry_csv_path"]:
        p = r.get(key)
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
                
    pdf_path = settings.OUTPUTS_DIR / f"{inspection_id}_report.pdf"
    if pdf_path.exists():
        try:
            os.remove(pdf_path)
        except Exception:
            pass

    InspectionRepository.delete(inspection_id)
    return {"status": "success", "message": f"Inspection '{inspection_id}' and associated artifacts deleted."}

@router.get("/{inspection_id}/report")
async def get_report(inspection_id: str):
    r = InspectionRepository.get_by_id(inspection_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found."
        )

    report_path = str(settings.OUTPUTS_DIR / f"{inspection_id}_report.pdf")
    if not os.path.exists(report_path):
        ReportService.generate_pdf(r, report_path)

    return FileResponse(
        path=report_path,
        media_type="application/pdf",
        filename=f"RoadVision_{inspection_id[:8]}_Report.pdf"
    )

@router.get("/{inspection_id}/export")
async def export_data(inspection_id: str, format: str = Query("json", pattern="^(json|csv)$")):
    r = InspectionRepository.get_by_id(inspection_id)
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection '{inspection_id}' not found."
        )

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Defect_Index", "Class_Name", "Confidence", "Relative_Area", "Severity_Score", "Severity_Level", "BBox_X1", "BBox_Y1", "BBox_X2", "BBox_Y2"])
        
        detections = r.get("detections", [])
        if detections:
            for idx, d in enumerate(detections, 1):
                box = d.get("bbox", [0, 0, 0, 0])
                writer.writerow([
                    idx,
                    d.get("class_name"),
                    d.get("confidence"),
                    d.get("relative_area"),
                    d.get("severity_score"),
                    d.get("severity_level"),
                    box[0] if len(box) > 0 else 0,
                    box[1] if len(box) > 1 else 0,
                    box[2] if len(box) > 2 else 0,
                    box[3] if len(box) > 3 else 0,
                ])
        else:
            writer.writerow(["No defects recorded in this inspection", "", "", "", "", "", "", "", "", ""])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=inspection_{inspection_id[:8]}_detections.csv"}
        )
    else:
        return r
