import React, { useState } from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';
import type { DetectionItem } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface DetectionTableProps {
  detections: DetectionItem[];
}

export const DetectionTable: React.FC<DetectionTableProps> = ({ detections }) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'idx' | 'conf' | 'area' | 'sev'>('sev');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Available classes
  const classes = Array.from(new Set(detections.map((d) => d.class_name)));

  // Filtered detections
  const filtered = detections.filter((d) => {
    if (selectedClass !== 'all' && d.class_name !== selectedClass) return false;
    if (selectedSeverity !== 'all' && d.severity_level !== selectedSeverity) return false;
    return true;
  });

  // Sorted detections
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'conf') diff = a.confidence - b.confidence;
    else if (sortBy === 'area') diff = a.relative_area - b.relative_area;
    else if (sortBy === 'sev') diff = a.severity_score - b.severity_score;
    else diff = 0;
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (field: 'conf' | 'area' | 'sev') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Table Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Detected Damage Instances ({filtered.length} of {detections.length})
          </h4>
          <p className="text-xs text-slate-500">
            Bounding box coordinates, confidence scores, and severity index
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-300">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              aria-label="Filter by damage class"
              className="bg-transparent text-xs text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-slate-900">All Classes</option>
              {classes.map((cls) => (
                <option key={cls} value={cls} className="bg-white text-slate-900">
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 border border-slate-300">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              aria-label="Filter by severity level"
              className="bg-transparent text-xs text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-slate-900">All Severities</option>
              <option value="High" className="bg-white text-rose-600">High</option>
              <option value="Medium" className="bg-white text-amber-600">Medium</option>
              <option value="Low" className="bg-white text-emerald-600">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Defect Class</th>
              <th
                onClick={() => toggleSort('conf')}
                className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Confidence</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('area')}
                className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Viewport Area</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('sev')}
                className="px-4 py-2.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Severity Score</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="px-4 py-2.5">Severity Level</th>
              <th className="px-4 py-2.5 text-right">Bounding Box (xyxy)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No defect instances match the selected filter criteria.
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    {item.class_name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-cyan-700 font-medium">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">
                    {(item.relative_area * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                    {item.severity_score.toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5">
                    <SeverityBadge level={item.severity_level} size="sm" />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-500">
                    [{item.bbox.join(', ')}]
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
