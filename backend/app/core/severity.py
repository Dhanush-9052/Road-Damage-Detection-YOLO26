"""
Severity Assessment & Explainable Road Risk Scoring Engine.
Reconstructed from project research notebook and MRDD benchmark.
"""

from typing import Dict, List, Tuple, Any
import numpy as np
from app.core.config import settings

def calculate_instance_severity(
    class_name: str,
    confidence: float,
    bbox_xyxy: List[float],
    frame_width: int,
    frame_height: int
) -> Tuple[float, str, float]:
    """
    Computes normalized instance severity score S_i in [0, 1]:
    S_i = w_class * (0.4 * conf_i + 0.6 * min(1.0, A_rel / 0.04))
    
    Area penalty saturates at 4% of total viewport area.
    Returns:
        (severity_score, severity_category, relative_area)
    """
    clean_name = str(class_name).lower().strip()
    w_class = settings.CLASS_WEIGHTS.get(clean_name, 0.70)
    
    x1, y1, x2, y2 = bbox_xyxy
    box_w = max(0.0, float(x2 - x1))
    box_h = max(0.0, float(y2 - y1))
    
    area_box = box_w * box_h
    total_area = max(1.0, float(frame_width * frame_height))
    rel_area = area_box / total_area
    
    # Area normalization penalty saturates at 4% of total frame area
    area_factor = min(1.0, rel_area / 0.04)
    severity_score = w_class * (0.4 * float(confidence) + 0.6 * area_factor)
    severity_score = float(np.clip(severity_score, 0.0, 1.0))
    
    if severity_score < settings.SEVERITY_LOW_MAX:
        category = "Low"
    elif severity_score < settings.SEVERITY_MED_MAX:
        category = "Medium"
    else:
        category = "High"
        
    return severity_score, category, rel_area

def calculate_aggregate_risk(severities: List[float], defect_counts: Dict[str, int]) -> Dict[str, Any]:
    """
    Computes explainable Aggregate Road Risk Score R in [0, 100]:
    R = min(100.0, sum(S_i) * 35.0)
    
    Also provides contributing factors and civil engineering advisory.
    """
    if not severities:
        return {
            "score": 0.0,
            "level": "Safe (Low Risk)",
            "risk_band": "Low",
            "advisory": "Pavement surface is structurally sound. Routine periodic monitoring recommended.",
            "factors": ["No defects detected in analyzed view"],
            "high_severity_count": 0,
            "medium_severity_count": 0,
            "low_severity_count": 0
        }
    
    raw_risk = float(np.sum(severities) * 35.0)
    risk_score = float(np.clip(raw_risk, 0.0, 100.0))
    
    # Categorize severities
    low_cnt = sum(1 for s in severities if s < settings.SEVERITY_LOW_MAX)
    med_cnt = sum(1 for s in severities if settings.SEVERITY_LOW_MAX <= s < settings.SEVERITY_MED_MAX)
    high_cnt = sum(1 for s in severities if s >= settings.SEVERITY_MED_MAX)
    
    factors = []
    if high_cnt > 0:
        factors.append(f"{high_cnt} high-severity defect(s) requiring immediate intervention")
    if med_cnt > 0:
        factors.append(f"{med_cnt} moderate-severity defect(s) exhibiting wear")
    if defect_counts.get("pothole", 0) > 0 or defect_counts.get("pothole_water", 0) > 0:
        p_cnt = defect_counts.get("pothole", 0) + defect_counts.get("pothole_water", 0)
        factors.append(f"{p_cnt} structural cavity/pothole instance(s) detected (high tire/axle impact)")
    if defect_counts.get("rut", 0) > 0:
        factors.append(f"{defect_counts['rut']} rutting defect(s) along wheelpaths (aquaplaning risk)")
    if defect_counts.get("crack", 0) > 2:
        factors.append(f"Multiple fractures detected ({defect_counts['crack']} cracks) - water infiltration potential")
    if not factors:
        factors.append(f"{len(severities)} minor surface imperfection(s) detected")

    if risk_score <= 30.0:
        level = "Safe (Low Risk)"
        risk_band = "Low"
        advisory = "Pavement surface condition is acceptable. Standard periodic monitoring recommended."
    elif risk_score <= 70.0:
        level = "Caution (Moderate Risk)"
        risk_band = "Medium"
        advisory = "Noticeable pavement distress detected. Preventative maintenance and surface patching advised to prevent sub-base degradation."
    else:
        level = "Danger (Critical Risk)"
        risk_band = "High"
        advisory = "Severe hazardous defects present! High risk of vehicle tire/suspension damage or vehicular instability. Urgent repair required."
        
    return {
        "score": round(risk_score, 1),
        "level": level,
        "risk_band": risk_band,
        "advisory": advisory,
        "factors": factors,
        "high_severity_count": high_cnt,
        "medium_severity_count": med_cnt,
        "low_severity_count": low_cnt
    }
