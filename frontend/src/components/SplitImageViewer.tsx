import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, SplitSquareVertical, Eye, Columns } from 'lucide-react';

interface SplitImageViewerProps {
  originalUrl: string;
  annotatedUrl: string;
  filename: string;
}

export const SplitImageViewer: React.FC<SplitImageViewerProps> = ({
  originalUrl,
  annotatedUrl,
  filename,
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'original' | 'split'>('annotated');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.75, prev - 0.25));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mode:
          </span>
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 border border-slate-300">
            <button
              onClick={() => setViewMode('annotated')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === 'annotated'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Annotated
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === 'original'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SplitSquareVertical className="h-3.5 w-3.5" />
              Original
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Side-by-Side
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-white p-0.5 border border-slate-300">
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-700 font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l border-slate-200 ml-0.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(true)}
            title="Full Screen Preview"
            className="rounded-lg bg-white p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Image View Canvas Area */}
      <div className="relative overflow-auto bg-slate-950 p-4 flex items-center justify-center min-h-[420px] max-h-[640px]">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Raw Input Photo
              </span>
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-black/60 flex items-center justify-center">
                <img
                  src={originalUrl}
                  alt="Original"
                  className="max-h-[500px] w-auto object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
                YOLO26 Annotated Detection Map
              </span>
              <div className="overflow-hidden rounded-lg border border-cyan-800/40 bg-black/60 flex items-center justify-center">
                <img
                  src={annotatedUrl}
                  alt="Annotated"
                  className="max-h-[500px] w-auto object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg flex items-center justify-center">
            <img
              src={viewMode === 'annotated' ? annotatedUrl : originalUrl}
              alt={filename}
              className="max-h-[560px] w-auto object-contain rounded-lg transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            />
          </div>
        )}
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-md">
          <div className="relative max-h-full max-w-full flex flex-col items-center">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute -top-10 right-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:bg-slate-700 border border-slate-600"
            >
              ✕ Close Preview
            </button>
            <img
              src={viewMode === 'original' ? originalUrl : annotatedUrl}
              alt={filename}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
