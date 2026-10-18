"""
Analytics and Aggregated KPI Endpoints.
"""

from fastapi import APIRouter
from app.database.db import InspectionRepository
from app.schemas.inspection import DashboardSummary

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary():
    return InspectionRepository.get_summary_stats()

@router.get("/recent-activity")
async def get_recent_activity():
    records = InspectionRepository.list_all(limit=8, offset=0)
    return [
        {
            "id": r["id"],
            "filename": r["original_filename"],
            "media_type": r["media_type"],
            "created_at": r["created_at"],
            "total_detections": r["total_detections"],
            "highest_severity": r["highest_severity"],
            "risk_score": r["risk_score"],
            "risk_level": r["risk_level"],
            "risk_band": r["risk_band"],
            "annotated_url": f"/api/outputs/{r['filename']}"
        }
        for r in records
    ]
