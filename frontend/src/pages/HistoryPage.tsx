import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Camera,
  Video,
  Eye,
  FileText,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

import { api } from '../services/api';
import type { InspectionListItem } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface HistoryPageProps {
  onSelectInspection: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onSelectInspection,
  onNavigate,
}) => {
  const [items, setItems] = useState<InspectionListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [mediaType, setMediaType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Delete modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInspections({
        limit: 100,
        media_type: mediaType || undefined,
        severity: severity || undefined,
        search: search || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inspection history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [mediaType, severity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await api.deleteInspection(deleteTargetId);
      setDeleteTargetId(null);
      fetchHistory();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search inspections by filename or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-hidden focus:border-cyan-500 transition-colors"
            />
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Media Type Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              aria-label="Filter by media type"
              className="bg-transparent text-xs text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="" className="bg-white text-slate-900">All Media</option>
              <option value="image" className="bg-white text-slate-900">Images Only</option>
              <option value="video" className="bg-white text-slate-900">Videos Only</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              aria-label="Filter by severity level"
              className="bg-transparent text-xs text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="" className="bg-white text-slate-900">All Severities</option>
              <option value="High" className="bg-white text-rose-600">High Severity</option>
              <option value="Medium" className="bg-white text-amber-600">Medium Severity</option>
              <option value="Low" className="bg-white text-emerald-600">Low Severity</option>
            </select>
          </div>

          <button
            onClick={fetchHistory}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          ⚠️ {error}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
            Audit Records Log ({items.length} of {total} inspections)
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Persistent SQLite DB
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">
              No Inspections Found
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || mediaType || severity
                ? 'No inspection records match your current filter parameters.'
                : 'No inspection records have been recorded yet.'}
            </p>
            <button
              onClick={() => onNavigate('image-inspect')}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-xs"
            >
              Perform First Inspection
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Inspection ID</th>
                  <th className="px-4 py-2.5">Filename / Source</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Detections</th>
                  <th className="px-4 py-2.5">Highest Severity</th>
                  <th className="px-4 py-2.5">Road Risk Score</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-cyan-700 font-semibold">
                      {item.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate">
                      {item.original_filename || item.filename}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        item.media_type === 'video'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      }`}>
                        {item.media_type === 'video' ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                        {item.media_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                      {item.total_detections}
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge level={item.highest_severity} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold">
                      <span className={item.risk_score > 70 ? 'text-rose-600' : item.risk_score > 30 ? 'text-amber-600' : 'text-emerald-600'}>
                        {item.risk_score.toFixed(1)} / 100
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectInspection(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>

                        <a
                          href={api.getReportPdfUrl(item.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md bg-white p-1.5 text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                          title="Download PDF Report"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </a>

                        <button
                          onClick={() => setDeleteTargetId(item.id)}
                          className="inline-flex items-center rounded-md bg-white p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-300 shadow-2xs transition-colors"
                          title="Delete Inspection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Delete Inspection Record?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete inspection <span className="font-mono text-cyan-700 font-semibold">{deleteTargetId.slice(0, 8)}...</span>? All associated annotated media files and telemetry reports will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500 shadow-xs transition-colors"
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
