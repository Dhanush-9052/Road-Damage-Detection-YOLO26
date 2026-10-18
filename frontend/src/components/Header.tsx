import React from 'react';
import { Camera, Video, Activity } from 'lucide-react';
import type { ModelInfo } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  modelInfo: ModelInfo | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  modelInfo,
}) => {
  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'System metrics, defect distribution, and network condition status',
    },
    'image-inspect': {
      title: 'Image Inspection',
      subtitle: 'Upload pavement photos for defect detection and severity assessment',
    },
    'video-inspect': {
      title: 'Video Inspection',
      subtitle: 'Process inspection footage and review annotated video telemetry',
    },
    history: {
      title: 'Inspection History',
      subtitle: 'Log of diagnostic inspections and downloadable audit reports',
    },
    analytics: {
      title: 'Defect Analytics',
      subtitle: 'Class breakdown, severity trends, and historical distributions',
    },
    about: {
      title: 'System Specifications',
      subtitle: 'Model architecture, defect classes, and scoring methodology',
    },
  };

  const current = pageTitles[activeTab] || {
    title: 'RoadVision AI',
    subtitle: 'Road damage inspection dashboard',
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight text-slate-900">
            {current.title}
          </h1>
          <span className="hidden md:inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
            MRDD 2026
          </span>
        </div>
        <p className="text-xs text-slate-500 line-clamp-1">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Model status pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
          <Activity className="h-3.5 w-3.5 text-cyan-600" />
          <span className="text-slate-500">Model:</span>
          <span className="font-mono text-slate-800">YOLO26s</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-emerald-600 font-medium">
            {modelInfo?.device?.toUpperCase() || 'CPU'}
          </span>
        </div>

        {/* Quick actions */}
        <button
          onClick={() => setActiveTab('image-inspect')}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-xs"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inspect Image</span>
        </button>

        <button
          onClick={() => setActiveTab('video-inspect')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Video className="h-3.5 w-3.5 text-cyan-600" />
          <span className="hidden sm:inline">Inspect Video</span>
        </button>
      </div>
    </header>
  );
};
