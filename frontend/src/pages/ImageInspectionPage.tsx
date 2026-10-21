import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  Sliders,
  Download,
  FileText,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

import { api } from '../services/api';
import type { Inspection } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { RiskGauge } from '../components/RiskGauge';
import { DetectionTable } from '../components/DetectionTable';
import { SeverityBadge } from '../components/SeverityBadge';

export const ImageInspectionPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Settings
  const [confThreshold, setConfThreshold] = useState<number>(0.20);
  const [iouThreshold, setIouThreshold] = useState<number>(0.45);
  const [imgSize, setImgSize] = useState<number>(640);

  // Status
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload a JPG, PNG, or WebP image.`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setError(null);
      const inspectionResult = await api.predictImage(
        selectedFile,
        confThreshold,
        iouThreshold,
        imgSize
      );
      setResult(inspectionResult);
    } catch (err: any) {
      setError(err.message || 'Inference failed on the selected image.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Upload & Controls Panel */}
      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dropzone Column */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                Road Surface Image
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Upload drone aerial captures or smartphone vehicular photos (JPG, PNG, WebP up to 25MB).
              </p>

              {!previewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-cyan-500 bg-cyan-50/50'
                      : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-cyan-600 border border-slate-200">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-1">
                    Select road photo file
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Drag and drop or browse files
                  </p>
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-600 border border-slate-200">
                    JPG, PNG, WEBP (Max 25MB)
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center max-h-[360px]">
                    <img
                      src={previewUrl}
                      alt="Selected upload"
                      className="max-h-[340px] w-auto object-contain rounded p-2"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={handleReset}
                        className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-xs transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <FileImage className="h-4 w-4 text-cyan-600" />
                      <div>
                        <span className="text-xs font-medium text-slate-800 block">
                          {selectedFile?.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Ready for Analysis
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Inference Settings Column */}
          <div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Sliders className="h-4 w-4 text-cyan-600" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Detection Parameters
                </h4>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">Confidence Threshold</span>
                  <span className="font-mono text-cyan-700 font-bold">
                    {(confThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.90"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Filters weak detections. Baseline: 0.20 (20%).
                </p>
              </div>

              {/* IOU Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">NMS IOU Threshold</span>
                  <span className="font-mono text-cyan-700 font-bold">
                    {(iouThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.80"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Non-Maximum Suppression overlap threshold.
                </p>
              </div>

              {/* Input Resolution */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">Input Image Size</span>
                  <span className="font-mono text-cyan-700 font-bold">{imgSize}px</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[480, 640, 1024].map((size) => (
                    <button
                      key={size}
                      onClick={() => setImgSize(size)}
                      className={`rounded py-1 text-xs font-mono font-medium transition-colors border ${
                        imgSize === size
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  YOLO image scaling dimensions.
                </p>
              </div>

              {/* Analyze Button */}
              <button
                disabled={!selectedFile || analyzing}
                onClick={handleAnalyze}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                  !selectedFile || analyzing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-xs'
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing Image...</span>
                  </>
                ) : (
                  <span>Analyze Image</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Top Results Header Banner with Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cyan-700">
                  Inspection ID: {result.id.slice(0, 8)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-800 font-medium">
                  {result.original_filename}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Resolution: {result.width}×{result.height} • Latency: {result.inference_time_ms} ms
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={result.annotated_url}
                download={`RoadVision_${result.id.slice(0, 8)}_annotated.jpg`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-cyan-600" />
                <span>Annotated Image</span>
              </a>

              <a
                href={api.getReportPdfUrl(result.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF Report</span>
              </a>

              <a
                href={api.getExportDataUrl(result.id, 'csv')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                title="Export CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>CSV</span>
              </a>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Inspect Another</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Total Defects
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {result.total_detections}
              </span>
              <span className="text-[11px] text-slate-400">instances localized</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Road Risk Score
              </span>
              <span className={`text-2xl font-bold mt-1 block ${
                result.risk.score > 70 ? 'text-rose-600' : result.risk.score > 30 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {result.risk.score.toFixed(1)} / 100
              </span>
              <span className="text-[11px] text-slate-500">{result.risk.level}</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Highest Severity
              </span>
              <div className="mt-2">
                <SeverityBadge level={result.highest_severity} size="md" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Inference Latency
              </span>
              <span className="text-2xl font-bold text-cyan-700 mt-1 block flex items-center gap-1 font-mono">
                <Clock className="h-4 w-4 text-cyan-600" />
                {result.inference_time_ms} ms
              </span>
              <span className="text-[11px] text-slate-400">Forward pass</span>
            </div>
          </div>

          {/* Visual Defect Map & Split Comparison Viewer */}
          <SplitImageViewer
            originalUrl={result.original_url}
            annotatedUrl={result.annotated_url}
            filename={result.filename}
          />

          {/* Risk Gauge & Civil Advisory */}
          <RiskGauge risk={result.risk} defectCount={result.total_detections} />

          {/* Class breakdown pills */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-3">
              Defect Category Breakdown:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(result.class_counts).map(([cls, cnt]) => (
                <div
                  key={cls}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    cnt > 0
                      ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{cls}:</span>
                  <span className="font-mono font-bold text-slate-900">{cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Detection Table */}
          {result.detections.length > 0 ? (
            <DetectionTable detections={result.detections} />
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <h4 className="text-sm font-semibold text-emerald-800 mb-1">
                Pavement Surface Clear — Zero Defects Detected
              </h4>
              <p className="text-xs text-emerald-600 max-w-md mx-auto">
                No surface cracks, potholes, rutting, abscissions, or heaves were identified above the {(confThreshold * 100).toFixed(0)}% confidence threshold.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
