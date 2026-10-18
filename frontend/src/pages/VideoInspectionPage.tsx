import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Sliders,
  Download,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
  Play,
  Gauge,
  Video as VideoIcon
} from 'lucide-react';

import { api } from '../services/api';
import type { Inspection, JobStatus } from '../types';
import { TimelineChart } from '../components/TimelineChart';
import { RiskGauge } from '../components/RiskGauge';
import { SeverityBadge } from '../components/SeverityBadge';

interface VideoInspectionPageProps {
  onSelectInspection: (id: string) => void;
}

export const VideoInspectionPage: React.FC<VideoInspectionPageProps> = ({
  onSelectInspection,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Settings
  const [confThreshold, setConfThreshold] = useState<number>(0.20);
  const [samplingStep, setSamplingStep] = useState<number>(1);
  const [emaAlpha, setEmaAlpha] = useState<number>(0.20);

  // Async Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<any>(null);

  const handleFileSelect = (file: File) => {
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setError('Please upload a supported video file (MP4, AVI, MOV, MKV, WebM).');
      return;
    }
    if (file.size > 250 * 1024 * 1024) {
      setError('Video file exceeds the 250MB size limit.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
    setJobId(null);
    setJobStatus(null);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setJobId(null);
    setJobStatus(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startVideoAnalysis = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      setJobStatus(null);
      setResult(null);

      const resp = await api.predictVideo(
        selectedFile,
        confThreshold,
        0.45,
        samplingStep,
        emaAlpha
      );

      setJobId(resp.job_id);

      // Start polling job status
      pollingRef.current = setInterval(async () => {
        try {
          const status = await api.getJobStatus(resp.job_id);
          setJobStatus(status);

          if (status.status === 'completed' && status.inspection_id) {
            clearInterval(pollingRef.current);
            const insp = await api.getInspection(status.inspection_id);
            setResult(insp);
          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current);
            setError(status.error_message || 'Video analysis encountered an unrecoverable failure.');
          }
        } catch (pollErr: any) {
          // Keep polling if temporary network glitch
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit video processing job.');
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 p-6">
      {!result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Upload Dropzone */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-semibold text-white mb-1">
                Road Survey Footage
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Select or drop dashcam/drone video. Frames are analyzed for road defects with telemetry overlay.
              </p>

              {!videoPreviewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-cyan-500 bg-slate-800'
                      : 'border-slate-700 bg-slate-950/60 hover:border-slate-500 hover:bg-slate-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.avi,.mov,.mkv,.webm"
                    className="hidden"
                    onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                    <VideoIcon className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-1">
                    Select inspection video file
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Drag and drop or browse files
                  </p>
                  <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-slate-700">
                    MP4, AVI, MOV, MKV, WEBM (Max 250MB)
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black max-h-[360px] flex items-center justify-center">
                    <video
                      src={videoPreviewUrl}
                      controls
                      playsInline
                      className="max-h-[340px] w-auto rounded"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={handleReset}
                        className="rounded bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-950 border border-slate-700 shadow"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Film className="h-4 w-4 text-cyan-400" />
                      <div>
                        <span className="text-xs font-medium text-white block">
                          {selectedFile?.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-medium">
                      Ready to Process
                    </span>
                  </div>
                </div>
              )}

              {/* Job Progress Indicator */}
              {jobStatus && (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      Processing: {jobStatus.status.toUpperCase()}
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {jobStatus.progress.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(3, jobStatus.progress)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      Frame: {jobStatus.current_frame} / {jobStatus.total_frames || '...'}
                    </span>
                    <span>Asynchronous processing</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Parameters Column */}
          <div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Detection Parameters
                </h4>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Confidence Threshold</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(confThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Minimum confidence for defect bounding boxes.
                </p>
              </div>

              {/* Frame Sampling Step */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Frame Sampling</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {samplingStep === 1 ? 'Every Frame (1x)' : `Every ${samplingStep} frames (${samplingStep}x)`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 5, 10].map((step) => (
                    <button
                      key={step}
                      onClick={() => setSamplingStep(step)}
                      className={`rounded py-1 text-xs font-mono font-medium transition-colors border ${
                        samplingStep === step
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {step}x
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Skip intervals to speed up long video evaluation.
                </p>
              </div>

              {/* EMA Smoothing Alpha */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Telemetry Smoothing (α)</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {emaAlpha.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={emaAlpha}
                  onChange={(e) => setEmaAlpha(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Exponential moving average filter for video risk score.
                </p>
              </div>

              {/* Process Button */}
              <button
                disabled={!selectedFile || (jobStatus !== null && jobStatus.status === 'processing')}
                onClick={startVideoAnalysis}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                  !selectedFile || (jobStatus !== null && jobStatus.status === 'processing')
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-cyan-600 text-white hover:bg-cyan-500'
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Process Video</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cyan-400">
                  Video Inspection Completed
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-200 font-medium">
                  {result.original_filename}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Duration: {result.duration_sec?.toFixed(1)}s • Analyzed: {result.frames_processed} frames • Risk: {result.risk.score.toFixed(1)}/100
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={result.annotated_url}
                download={`RoadVision_${result.id.slice(0, 8)}_annotated.mp4`}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Video</span>
              </a>

              {result.telemetry_csv_url && (
                <a
                  href={result.telemetry_csv_url}
                  download={`RoadVision_${result.id.slice(0, 8)}_telemetry.csv`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Telemetry CSV</span>
                </a>
              )}

              <button
                onClick={() => onSelectInspection(result.id)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <span>Audit Details</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Inspect Another</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs font-medium text-slate-400 block">
                Total Detections
              </span>
              <span className="text-2xl font-bold text-white mt-1 block">
                {result.total_detections}
              </span>
              <span className="text-[11px] text-slate-500">{result.frames_processed} frames analyzed</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs font-medium text-slate-400 block">
                Peak Road Risk
              </span>
              <span className={`text-2xl font-bold mt-1 block ${
                result.risk.score > 70 ? 'text-rose-400' : result.risk.score > 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {result.risk.score.toFixed(1)} / 100
              </span>
              <span className="text-[11px] text-slate-500">{result.risk.level}</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs font-medium text-slate-400 block">
                Highest Severity
              </span>
              <div className="mt-2">
                <SeverityBadge level={result.highest_severity} size="md" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <span className="text-xs font-medium text-slate-400 block">
                Processing Speed
              </span>
              <span className="text-2xl font-bold text-cyan-400 mt-1 block font-mono flex items-center gap-1">
                <Gauge className="h-4 w-4 text-cyan-500" />
                {result.fps ? `${result.fps.toFixed(1)} FPS` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-500">Telemetry render rate</span>
            </div>
          </div>

          {/* Video Player Display - Plays directly in page */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Annotated Video Stream
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {result.width}×{result.height} • {result.fps ? `${result.fps.toFixed(1)} FPS` : '25 FPS'} • H.264
              </span>
            </div>

            <div className="relative overflow-hidden rounded-lg bg-black flex items-center justify-center">
              <video
                key={result.annotated_url}
                controls
                playsInline
                preload="auto"
                className="w-full max-h-[520px] rounded-lg bg-black object-contain shadow-inner"
              >
                <source src={result.annotated_url} type="video/mp4" />
                Your browser does not support HTML5 video streaming. Please download the video file to play.
              </video>
            </div>
          </div>

          {/* Video Telemetry Timeline Chart */}
          {result.frame_timeline && (
            <TimelineChart timeline={result.frame_timeline} />
          )}

          {/* Overall Risk & Civil Advisory */}
          <RiskGauge risk={result.risk} defectCount={result.total_detections} />
        </div>
      )}
    </div>
  );
};
