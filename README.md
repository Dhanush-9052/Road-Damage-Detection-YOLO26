# RoadVision AI — Intelligent Road Damage Inspection & Severity Assessment

**AI-powered road damage detection, severity assessment and risk analysis using YOLO26.**

Built upon the Multisource Road Defect Dataset (MRDD 2026) benchmark, RoadVision AI is an end-to-end full-stack computer vision platform designed for municipal infrastructure inspection, civil road audits, and academic demonstrations.

---

## 📌 Where to Put Your `best.pt` File?

If you ever train a new model or download an updated checkpoint from Google Colab:
- **Default Location:** Place your trained weights file at:
  ```
  roadvision-ai/backend/models/best.pt
  ```
- **Custom Location via Environment Variable:**
  You can set the `MODEL_PATH` variable in `backend/.env`:
  ```bash
  MODEL_PATH=C:/path/to/your/custom_best.pt
  ```
> **Good news:** Your trained weights from Downloads have already been validated and configured at `roadvision-ai/backend/models/best.pt` with all 6 target defect classes!

---

## 🏷️ Supported Damage Classes

The trained model detects the following six classes:

| Class ID | Class Name | Hazard Weight | Description |
| :---: | :--- | :---: | :--- |
| **0** | **Crack** | 0.60 | Surface fracture; conduit for moisture infiltration |
| **1** | **Pothole** | 1.00 | Localized structural cavity; high tire/suspension hazard |
| **2** | **Abscission** | 0.70 | Delamination or peeling of surface asphalt/mortar |
| **3** | **Rut** | 0.90 | Longitudinal groove along wheelpaths; aquaplaning risk |
| **4** | **Repair** | 0.30 | Pre-existing maintenance patch; monitor for reopening |
| **5** | **Undulation** | 0.85 | Upheaval / vertical heave causing high-speed vehicle bounce |

---

## 📊 Verified Model Benchmark Performance (Held-Out Test Set: 1,863 Images)

Extracted from Google Colab test evaluation run on an NVIDIA Tesla T4 GPU:

- **Overall Precision (P):** 95.23% (0.9523)
- **Overall Recall (R):** 90.87% (0.9087)
- **Overall mAP@50:** 95.45% (0.9545)
- **Overall mAP@50-95:** 60.98% (0.6098)

| Defect Class | Precision (%) | Recall (%) | mAP@50 (%) | mAP@50-95 (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Pothole** | 96.17% | 93.74% | 97.05% | 59.20% |
| **Crack** | 93.71% | 87.76% | 93.12% | 58.11% |
| **Rut** | 93.45% | 88.80% | 93.87% | 61.52% |
| **Abscission** | 93.48% | 89.43% | 94.10% | 58.63% |
| **Undulation** | 97.67% | 89.11% | 95.86% | 62.80% |
| **Repair** | 96.89% | 96.37% | 98.67% | 65.64% |

---

## 📐 Severity & Risk Scoring Engine

### 1. Instance Severity Index ($S_i \in [0, 1]$)
$$S_i = w_{class} \times \left(0.4 \times \text{conf}_i + 0.6 \times \min\left(1.0, \frac{A_{rel}}{0.04}\right)\right)$$
- **Low Severity:** $S_i < 0.35$ (Emerald Green)
- **Medium Severity:** $0.35 \le S_i < 0.65$ (Amber Orange)
- **High Severity:** $S_i \ge 0.65$ (Crimson Red)

### 2. Aggregate Road Risk Score ($R \in [0, 100]$)
$$R = \min\left(100.0, \sum_{i=1}^{N} S_i \times 35.0\right)$$
- **Safe (Low Risk):** $0 \le R \le 30$ — Routine periodic monitoring.
- **Caution (Moderate Risk):** $31 \le R \le 70$ — Preventative patching advised.
- **Danger (Critical Risk):** $71 \le R \le 100$ — Severe defect hazard; urgent repair dispatch.

### 3. Video Telemetry Smoothing
$$R_{smooth}(t) = \alpha \cdot R(t) + (1 - \alpha) \cdot R_{smooth}(t-1) \quad (\alpha = 0.20)$$

---

## 🛠️ Step-by-Step Setup & Execution Instructions (Windows & VS Code)

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ (tested on Node v22)
- Git (optional)

---

### Step 1: Open Terminal in VS Code
Open the project directory in VS Code:
```powershell
cd c:\Users\sivat\.gemini\antigravity-ide\scratch\roadvision-ai
```

---

### Step 2: Set Up Backend Virtual Environment
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

### Step 3: Install Backend Dependencies
```powershell
pip install -r requirements.txt
```

---

### Step 4: Verify Model Weights
Verify that `best.pt` is in place:
```powershell
python -c "from ultralytics import YOLO; m = YOLO('models/best.pt'); print('Loaded classes:', m.names)"
```

---

### Step 5: Start FastAPI Backend Server
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Health Check: `http://localhost:8000/api/health`
- Swagger Interactive Docs: `http://localhost:8000/docs`

---

### Step 6: Install Frontend Dependencies & Start Vite
Open a **second terminal** in VS Code:
```powershell
cd c:\Users\sivat\.gemini\antigravity-ide\scratch\roadvision-ai\frontend
npm install
npm run dev
```

---

### Step 7: Open in Browser
Visit:
```
http://localhost:5173
```

---

### Step 8: Build Production Frontend Bundle
To build the optimized static production bundle:
```powershell
cd frontend
npm run build
```

---

### Step 9: Run Automated Test Suite
To verify model loading, severity heuristics, inference, API endpoints, and report generation:
```powershell
cd c:\Users\sivat\.gemini\antigravity-ide\scratch\roadvision-ai
.\backend\.venv\Scripts\pytest.exe tests -v
```

---

## 🚀 Live Demonstration Workflow for Faculty Presentation

1. **Dashboard Overview:**
   - Present the KPI cards (Total Inspections, Defect Instances, High Severity Hazards, Mean Confidence).
   - Demonstrate the Defect Classification Bar Chart and Severity Breakdown Donut Chart.

2. **Single Image Inspection:**
   - Navigate to **Image Inspection**.
   - Upload a road defect photo (e.g. pothole or asphalt crack).
   - Adjust the **Confidence Threshold** (e.g., 20%) and **IOU Threshold** (0.45).
   - Click **Run Road Damage Analysis**.
   - Demonstrate the **Split/Toggle Viewer** (Original, Annotated, Side-by-Side, Zoom).
   - Showcase the **Aggregate Road Risk Gauge**, **Civil Engineering Advisory**, and filterable **Detections Table**.
   - Download the official **PDF Inspection Report** and **CSV telemetry**.

3. **Video Telemetry Processing:**
   - Navigate to **Video Inspection**.
   - Upload an MP4 dashcam video.
   - Set **Frame Sampling Interval** (e.g. 2x) and **EMA Smoothing Factor** (0.20).
   - Click **Process Inspection Video**.
   - Show the real-time background progress bar polling.
   - Review the generated output video featuring the **Real-Time HUD Telemetry Banner** and the **Timeline Risk Chart**.

4. **Inspection Audit History:**
   - Navigate to **Inspection History** to show that all inspections persist in SQLite.
   - Filter by media type, severity level, or search keyword.

5. **About the Project:**
   - Review the academic methodology, MRDD 2026 provenance, YOLO26s neural network parameters, precision/recall/mAP table, and structural engineering limitations.

---

## ⚠️ Academic & Municipal Limitations

- **2D Monocular Vision:** 2D bounding boxes estimate surface extent, not physical pothole cavity depth or sub-base volumetric displacement.
- **Civil Engineering Advisory:** The Road Risk Score (0–100) is a research-grade heuristic indicator designed for priority dispatching. It does not replace certified ASTM D6433 manual core sampling.

---

## 📄 License
Academic Research and Municipal Road Inspection Prototype. All Rights Reserved.
