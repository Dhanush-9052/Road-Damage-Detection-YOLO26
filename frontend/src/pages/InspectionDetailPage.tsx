import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  Trash2,
  Clock,
  Layers,
  AlertTriangle
} from 'lucide-react';

import { api } from '../services/api';
import type { Inspection } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { RiskGauge } from '../components/RiskGauge';
import { DetectionTable } from '../components/DetectionTable';
import { SeverityBadge } from '../components/SeverityBadge';
import { TimelineChart } from '../components/TimelineChart';

interface InspectionDetailPageProps {
  inspectionId: string;
  onBack: () => void;
}

export const InspectionDetailPage: React.FC<InspectionDetailPageProps> = ({
  inspectionId,
  onBack,
}) => {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getInspection(inspectionId);
        setInspection(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load inspection detail');
      } finally {
        setLoading(false);
      }
    };
    fetchInspection();
  }, [inspectionId]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteInspection(inspectionId);
      setShowDeleteModal(false);
      onBack();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading Inspection Record...</span>
        </div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </button>
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-6 text-center text-rose-300">
          <p className="font-bold">Error loading inspection record:</p>
          <p className="text-xs mt-1 text-slate-400">{error || 'Record not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Inspections List
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={inspection.annotated_url}
            download
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Annotated File</span>
          </a>

          <a
            href={api.getReportPdfUrl(inspection.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF Report</span>
          </a>

          <a
            href={api.getExportDataUrl(inspection.id, 'csv')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-rose-950/60 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-900 border border-rose-800/60 transition-all ml-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Inspection Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 font-mono">
                ID: {inspection.id}
              </span>
              <span className="text-slate-500">•</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase border border-slate-700">
                {inspection.media_type}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              {inspection.original_filename}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspected on {new Date(inspection.created_at).toLocaleString()} • Model: Ultralytics YOLO26s (MRDD 2026)
            </p>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-800 pl-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Highest Severity
              </span>
              <SeverityBadge level={inspection.highest_severity} size="sm" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Mean Confidence
              </span>
              <span className="text-lg font-mono font-bold text-cyan-400">
                {(inspection.avg_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Latency
              </span>
              <span className="text-lg font-mono font-bold text-white flex items-center gap-1">
                <Clock className="h-4 w-4 text-slate-500" />
                {inspection.inference_time_ms}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Media Inspection Viewer */}
      {inspection.media_type === 'image' ? (
        <SplitImageViewer
          originalUrl={inspection.original_url}
          annotatedUrl={inspection.annotated_url}
          filename={inspection.filename}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Annotated Video Stream
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {inspection.width}×{inspection.height} • {inspection.fps ? `${inspection.fps.toFixed(1)} FPS` : '25 FPS'}
              </span>
            </div>
            <div className="relative overflow-hidden rounded-lg bg-black flex items-center justify-center">
              <video
                key={inspection.annotated_url}
                controls
                playsInline
                preload="auto"
                className="w-full max-h-[520px] rounded-lg bg-black object-contain"
              >
                <source src={inspection.annotated_url} type="video/mp4" />
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          </div>

          {inspection.frame_timeline && (
            <TimelineChart timeline={inspection.frame_timeline} />
          )}
        </div>
      )}

      {/* Risk Gauge & Engineering Advisory */}
      <RiskGauge risk={inspection.risk} defectCount={inspection.total_detections} />

      {/* Class Counts Summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
          Class Breakdown Summary:
        </span>
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(inspection.class_counts).map(([cls, cnt]) => (
            <div
              key={cls}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                cnt > 0
                  ? 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300'
                  : 'border-slate-800 bg-slate-950/40 text-slate-500'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{cls}:</span>
              <span className="font-mono font-bold text-white">{cnt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detections Table (if image detections exist) */}
      {inspection.detections && inspection.detections.length > 0 && (
        <DetectionTable detections={inspection.detections} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Delete Inspection Record?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete this inspection record and all associated annotated media files and telemetry reports from persistent storage.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-all shadow-md shadow-rose-600/30"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
