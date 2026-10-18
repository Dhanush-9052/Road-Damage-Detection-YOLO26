"""
PDF Inspection Report Generation Service using ReportLab.
Produces academic- and municipality-grade diagnostic reports for road inspections.
"""

import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.core.config import settings

class ReportService:
    @staticmethod
    def generate_pdf(inspection: Dict[str, Any], output_pdf_path: str) -> str:
        doc = SimpleDocTemplate(
            output_pdf_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            fontName='Helvetica'
        )
        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155'),
            fontName='Helvetica'
        )
        callout_style = ParagraphStyle(
            'AdvisoryText',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=7.5,
            leading=11,
            textColor=colors.HexColor('#64748b'),
            fontName='Helvetica-Oblique'
        )

        elements = []

        # 1. Header Banner
        elements.append(Paragraph("RoadVision AI — Inspection Report", title_style))
        elements.append(Paragraph("AI-Powered Road Damage Detection, Severity Assessment & Risk Analysis", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceBefore=8, spaceAfter=12))

        # 2. Metadata Table
        created_at_str = inspection.get("created_at", datetime.now().isoformat())
        try:
            dt = datetime.fromisoformat(created_at_str)
            date_display = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            date_display = created_at_str

        meta_data = [
            [
                Paragraph("<b>Inspection ID:</b>", body_style),
                Paragraph(str(inspection.get("id", "N/A")), body_style),
                Paragraph("<b>Date / Time:</b>", body_style),
                Paragraph(date_display, body_style)
            ],
            [
                Paragraph("<b>Source File:</b>", body_style),
                Paragraph(str(inspection.get("original_filename", inspection.get("filename", "N/A"))), body_style),
                Paragraph("<b>Inspection Type:</b>", body_style),
                Paragraph(str(inspection.get("media_type", "image")).upper(), body_style)
            ],
            [
                Paragraph("<b>Model Architecture:</b>", body_style),
                Paragraph("Ultralytics YOLO26s (MRDD 2026)", body_style),
                Paragraph("<b>Inference Time:</b>", body_style),
                Paragraph(f"{inspection.get('inference_time_ms', 0):.1f} ms", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[1.4*inch, 2.2*inch, 1.4*inch, 2.2*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 12))

        # 3. Overall Risk & KPI Assessment Box
        risk_score = inspection.get("risk_score", 0.0)
        risk_level = inspection.get("risk_level", "Unknown")
        risk_color = colors.HexColor('#dc2626') if risk_score > 70 else (
            colors.HexColor('#d97706') if risk_score > 30 else colors.HexColor('#16a34a')
        )

        kpi_data = [
            [
                Paragraph("ROAD RISK SCORE", ParagraphStyle('H', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)),
                Paragraph("RISK LEVEL", ParagraphStyle('H', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)),
                Paragraph("TOTAL DEFECTS", ParagraphStyle('H', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)),
                Paragraph("HIGHEST SEVERITY", ParagraphStyle('H', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)),
                Paragraph("AVG CONFIDENCE", ParagraphStyle('H', parent=body_style, fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)),
            ],
            [
                Paragraph(f"<b>{risk_score:.1f} / 100</b>", ParagraphStyle('V', parent=body_style, fontSize=14, textColor=risk_color, alignment=1)),
                Paragraph(f"<b>{risk_level}</b>", ParagraphStyle('V', parent=body_style, fontSize=11, textColor=risk_color, alignment=1)),
                Paragraph(f"<b>{inspection.get('total_detections', 0)}</b>", ParagraphStyle('V', parent=body_style, fontSize=14, textColor=colors.HexColor('#0f172a'), alignment=1)),
                Paragraph(f"<b>{inspection.get('highest_severity', 'None')}</b>", ParagraphStyle('V', parent=body_style, fontSize=12, textColor=risk_color, alignment=1)),
                Paragraph(f"<b>{inspection.get('avg_confidence', 0.0)*100:.1f}%</b>", ParagraphStyle('V', parent=body_style, fontSize=14, textColor=colors.HexColor('#0f172a'), alignment=1)),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[1.45*inch]*5)
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
            ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 10))

        # Advisory Callout Box
        advisory_text = inspection.get("advisory", "No specific advisory available.")
        adv_table = Table([[
            Paragraph(f"<b>Civil Engineering Advisory:</b> {advisory_text}", callout_style)
        ]], colWidths=[7.25*inch])
        adv_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e0f2fe')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#38bdf8')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        elements.append(adv_table)
        elements.append(Spacer(1, 14))

        # 4. Damage Class & Severity Distribution Tables
        elements.append(Paragraph("Defect Distribution Breakdown", h2_style))
        
        class_counts = inspection.get("class_counts", {})
        total_dets = max(1, inspection.get("total_detections", 0))
        
        dist_rows = [
            [
                Paragraph("<b>Defect Category</b>", body_style),
                Paragraph("<b>Detected Count</b>", body_style),
                Paragraph("<b>Proportion (%)</b>", body_style),
                Paragraph("<b>Hazard Weight</b>", body_style)
            ]
        ]
        
        for cls_name, cnt in sorted(class_counts.items(), key=lambda x: x[1], reverse=True):
            if cnt > 0:
                prop = (cnt / total_dets) * 100.0
                hw = settings.CLASS_WEIGHTS.get(cls_name.lower(), 0.70)
                dist_rows.append([
                    Paragraph(cls_name, body_style),
                    Paragraph(str(cnt), body_style),
                    Paragraph(f"{prop:.1f}%", body_style),
                    Paragraph(f"{hw:.2f}", body_style)
                ])

        if len(dist_rows) == 1:
            dist_rows.append([Paragraph("No defects detected", body_style), Paragraph("0", body_style), Paragraph("0%", body_style), Paragraph("-", body_style)])

        dist_table = Table(dist_rows, colWidths=[2.2*inch, 1.6*inch, 1.6*inch, 1.85*inch])
        dist_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(dist_table)
        elements.append(Spacer(1, 14))

        # 5. Image Preview (Annotated Output)
        annotated_path = inspection.get("annotated_path")
        if annotated_path and os.path.exists(annotated_path) and inspection.get("media_type") == "image":
            try:
                elements.append(Paragraph("Annotated Inspection Image", h2_style))
                img = RLImage(annotated_path, width=6.5*inch, height=3.6*inch)
                elements.append(img)
                elements.append(Spacer(1, 14))
            except Exception:
                pass

        # 6. Detailed Detections Table (Top 12 for images)
        detections = inspection.get("detections", [])
        if detections:
            elements.append(Paragraph(f"Individual Detections Audit (Top {min(15, len(detections))} instances)", h2_style))
            det_rows = [
                [
                    Paragraph("<b>#</b>", body_style),
                    Paragraph("<b>Class</b>", body_style),
                    Paragraph("<b>Confidence</b>", body_style),
                    Paragraph("<b>Viewport Area</b>", body_style),
                    Paragraph("<b>Severity Index</b>", body_style),
                    Paragraph("<b>Severity Tier</b>", body_style)
                ]
            ]
            for idx, d in enumerate(detections[:15], 1):
                tier_color = colors.HexColor('#dc2626') if d['severity_level'] == 'High' else (
                    colors.HexColor('#d97706') if d['severity_level'] == 'Medium' else colors.HexColor('#16a34a')
                )
                det_rows.append([
                    Paragraph(str(idx), body_style),
                    Paragraph(d['class_name'], body_style),
                    Paragraph(f"{d['confidence']*100:.1f}%", body_style),
                    Paragraph(f"{d['relative_area']*100:.2f}%", body_style),
                    Paragraph(f"{d['severity_score']:.3f}", body_style),
                    Paragraph(f"<b>{d['severity_level']}</b>", ParagraphStyle('T', parent=body_style, textColor=tier_color))
                ])

            det_table = Table(det_rows, colWidths=[0.5*inch, 1.8*inch, 1.2*inch, 1.25*inch, 1.25*inch, 1.25*inch])
            det_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f1f5f9')),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            elements.append(det_table)
            elements.append(Spacer(1, 14))

        # 7. Disclaimer & Academic Citations
        disclaimer_text = (
            "<b>NOTICE & LIMITATIONS:</b> This diagnostic assessment is generated automatically by an AI model "
            "(Ultralytics YOLO26s) trained on the Multisource Road Defect Dataset (MRDD 2026). "
            "Severity estimates ($S_i$) and aggregate risk scores ($R$) are computed via 2D bounding-box heuristics "
            "and hazard-weighted surface area approximations. They do not constitute certified ASTM D6433 Pavement "
            "Condition Index (PCI) measurements or structural core depth measurements. On-site civil engineering "
            "verification is required prior to maintenance dispatch."
        )
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#cbd5e1'), spaceBefore=6, spaceAfter=8))
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        # Build PDF
        doc.build(elements)
        return output_pdf_path
