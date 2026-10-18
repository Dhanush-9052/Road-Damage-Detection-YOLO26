import React from 'react';
import {
  Cpu,
  Database,
  Calculator,
  Workflow,
  AlertTriangle,
  Code2,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const benchmarkClasses = [
    { name: 'Pothole', id: 0, precision: '96.17%', recall: '93.74%', map50: '97.05%', map50_95: '59.20%', color: '#ef4444', desc: 'Localized depression/cavity in wearing course. High tire/suspension hazard.' },
    { name: 'Crack', id: 1, precision: '93.71%', recall: '87.76%', map50: '93.12%', map50_95: '58.11%', color: '#10b981', desc: 'Longitudinal, transverse, or alligator fracture. Conduit for moisture infiltration.' },
    { name: 'Rut', id: 2, precision: '93.45%', recall: '88.80%', map50: '93.87%', map50_95: '61.52%', color: '#3b82f6', desc: 'Longitudinal surface depression along wheelpaths. Major aquaplaning risk.' },
    { name: 'Abscission', id: 3, precision: '93.48%', recall: '89.43%', map50: '94.10%', map50_95: '58.63%', color: '#f97316', desc: 'Delamination, stripping, or loss of pavement surface mortar/aggregate.' },
    { name: 'Undulation', id: 4, precision: '97.67%', recall: '89.11%', map50: '95.86%', map50_95: '62.80%', color: '#a855f7', desc: 'Surface upheaval or frost boils causing dangerous vertical heave.' },
    { name: 'Repair', id: 5, precision: '96.89%', recall: '96.37%', map50: '98.67%', map50_95: '65.64%', color: '#06b6d4', desc: 'Pre-existing maintenance patch or sealed fissure to monitor for reopening.' },
  ];

  const workflowSteps = [
    { title: 'Uploaded Media', desc: 'High-res image or video stream from smartphone or UAV drone' },
    { title: 'Preprocessing', desc: 'OpenCV frame decoding, scaling (640x640), normalization' },
    { title: 'YOLO26 Inference', desc: 'Trained best.pt forward pass on GPU (CUDA) or CPU fallback' },
    { title: 'Damage Detection', desc: 'Task-aligned bbox regression, class classification, NMS' },
    { title: 'Severity Assessment', desc: 'Instance severity S_i formulation based on hazard weight & area' },
    { title: 'Road Risk Analysis', desc: 'Aggregate risk score R (0-100) + EMA video smoothing + advisory' },
    { title: 'Diagnostic Report', desc: 'Interactive visual HUD, timeline charts, and PDF download' },
  ];

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
            System Architecture & Methodology
          </span>
          <span className="text-xs text-slate-500 font-mono">MRDD 2026</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Road Damage Detection and Severity Assessment
        </h1>
        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-3xl">
          Platform specifications for YOLO26 defect detection, severity scoring formulation, and aggregate road condition telemetry.
        </p>
      </div>

      {/* Workflow Diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Workflow className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            End-to-End System Architecture Workflow
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          {workflowSteps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-center">
              <div>
                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 font-mono text-[11px] font-bold border border-cyan-800 mb-2">
                  {idx + 1}
                </span>
                <h4 className="text-xs font-bold text-white mb-1">{step.title}</h4>
                <p className="text-[10px] text-slate-400 leading-tight">{step.desc}</p>
              </div>
              {idx < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-cyan-500/40">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verified Empirical Benchmark Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Empirical Evaluation Benchmark (Held-Out Test Set: 1,863 Images)
            </h3>
          </div>
          <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-800/60">
            Overall mAP@50: 95.45%
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Strictly extracted from the Google Colab testing evaluation log (Cell 9) executed on NVIDIA Tesla T4 GPU:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Defect Category</th>
                <th className="px-4 py-3">Precision (P)</th>
                <th className="px-4 py-3">Recall (R)</th>
                <th className="px-4 py-3 text-cyan-400">mAP@50</th>
                <th className="px-4 py-3">mAP@50-95</th>
                <th className="px-4 py-3">Engineering Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {benchmarkClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-slate-500">{cls.id}</td>
                  <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cls.color }} />
                    <span>{cls.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{cls.precision}</td>
                  <td className="px-4 py-3 font-mono">{cls.recall}</td>
                  <td className="px-4 py-3 font-mono font-bold text-cyan-300">{cls.map50}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{cls.map50_95}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 max-w-xs">{cls.desc}</td>
                </tr>
              ))}
              <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700">
                <td className="px-4 py-3 text-cyan-400">—</td>
                <td className="px-4 py-3 text-white uppercase tracking-wider">ALL CLASSES (Mean)</td>
                <td className="px-4 py-3 font-mono text-white">95.23%</td>
                <td className="px-4 py-3 font-mono text-white">90.87%</td>
                <td className="px-4 py-3 font-mono text-cyan-300 text-sm">95.45%</td>
                <td className="px-4 py-3 font-mono text-white">60.98%</td>
                <td className="px-4 py-3 text-[11px] text-slate-300">Weighted cross-domain macro-average</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              MRDD 2026 Dataset Provenance
            </h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <li>• <strong>Total Dataset Volume:</strong> 12,388 images, 39,683 ground-truth bounding boxes.</li>
            <li>• <strong>Sensing Modalities:</strong> Handheld & vehicle-mounted Smartphones + Unmanned Aerial Vehicles (UAVs / Drones).</li>
            <li>• <strong>Pavement Materials:</strong> Flexible Asphalt pavement, Rigid Concrete pavement, and Interlocking Brick pavement.</li>
            <li>• <strong>Stratified Split:</strong> 70% Training (8,669 images), 15% Validation (1,856 images), 15% Test (1,863 images).</li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Deep Learning Architecture
            </h3>
          </div>
          <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
            <li>• <strong>Neural Model:</strong> Ultralytics YOLO26 Small (<code className="text-cyan-300">yolo26s.pt</code>).</li>
            <li>• <strong>Feature Aggregation:</strong> C3k2 and C2PSA (Spatial Attention) cross-stage modules.</li>
            <li>• <strong>Receptive Field:</strong> SPPF (Spatial Pyramid Pooling - Fast).</li>
            <li>• <strong>Parameters & FLOPs:</strong> 260 layers, 9,952,508 parameters (22.8 GFLOPs).</li>
            <li>• <strong>Training Setup:</strong> AdamW optimizer, batch size 16, 640×640 resolution, Tesla T4 GPU.</li>
          </ul>
        </div>
      </div>

      {/* Severity & Risk Mathematical Formulations */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calculator className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Severity Assessment & Risk Scoring Formulations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <h4 className="font-bold text-cyan-300 text-sm">1. Instance Severity Index (S_i ∈ [0, 1])</h4>
            <div className="font-mono bg-slate-900 p-2.5 rounded-md text-slate-200 border border-slate-800">
              S_i = w_class × [0.4 · conf_i + 0.6 · min(1.0, A_rel / 0.04)]
            </div>
            <p className="text-[11px] text-slate-400">
              Where <code className="text-cyan-400">A_rel = (w_box · h_box) / (W_frame · H_frame)</code>. The relative viewport area saturates at 4% of the image frame.
            </p>
            <div className="text-[11px] space-y-1 pt-1">
              <div>• <strong>Low Severity:</strong> S_i &lt; 0.35 (Green) — Superficial wear</div>
              <div>• <strong>Medium Severity:</strong> 0.35 ≤ S_i &lt; 0.65 (Orange) — Noticeable distress</div>
              <div>• <strong>High Severity:</strong> S_i ≥ 0.65 (Red) — Priority intervention required</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2">
            <h4 className="font-bold text-cyan-300 text-sm">2. Aggregate Road Risk Score (R ∈ [0, 100])</h4>
            <div className="font-mono bg-slate-900 p-2.5 rounded-md text-slate-200 border border-slate-800">
              R = min(100.0, ∑(S_i) × 35.0)
            </div>
            <div className="font-mono bg-slate-900 p-2.5 rounded-md text-slate-200 border border-slate-800">
              R_smooth(t) = α · R(t) + (1 - α) · R_smooth(t - 1)
            </div>
            <p className="text-[11px] text-slate-400">
              EMA temporal smoothing (α = 0.20) removes high-frequency vehicular camera shake noise across video frames.
            </p>
            <div className="text-[11px] space-y-1 pt-1">
              <div>• <strong>0 to 30:</strong> Safe (Low Risk) — Satisfactory condition</div>
              <div>• <strong>31 to 70:</strong> Caution (Moderate Risk) — Maintenance patching advised</div>
              <div>• <strong>71 to 100:</strong> Danger (Critical Risk) — Severe tire/suspension hazard</div>
            </div>
          </div>
        </div>
      </div>

      {/* Limitations and Disclaimers */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Important Civil Engineering & Vision Limitations
          </h3>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          1. <strong>2D Monocular Vision vs 3D Depth:</strong> Monocular camera frames cannot measure real-world physical pothole cavity depth, volumetric displacement, or sub-base moisture saturation without LiDAR point clouds or calibrated stereoscopic sensors. Bounding-box area is an estimate of surface extent.
        </p>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          2. <strong>Regulatory Certification:</strong> The calculated Road Risk Score (0-100) is a research-grade heuristic indicator. It does not replace ASTM D6433 certified Pavement Condition Index (PCI) manual core sampling or structural geotechnical inspection.
        </p>
      </div>

      {/* Technology Stack */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Code2 className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Technology Stack & Implementation
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <span className="font-bold text-cyan-400 block mb-1">Frontend</span>
            <span className="text-slate-300">React 19 + TypeScript + Vite + Tailwind CSS v4</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <span className="font-bold text-cyan-400 block mb-1">Visualization</span>
            <span className="text-slate-300">Recharts + Lucide Icons + Custom Canvas HUD</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <span className="font-bold text-cyan-400 block mb-1">Backend</span>
            <span className="text-slate-300">FastAPI + Uvicorn + Pydantic v2</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <span className="font-bold text-cyan-400 block mb-1">Computer Vision</span>
            <span className="text-slate-300">Ultralytics YOLO + OpenCV + PyTorch + ReportLab</span>
          </div>
        </div>
      </div>
    </div>
  );
};
