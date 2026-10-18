import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Target,
  Camera,
  Video,
  Eye,
  Activity,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { api } from '../services/api';
import type { DashboardSummary, InspectionListItem } from '../types';
import { MetricCard } from '../components/MetricCard';
import { SeverityBadge } from '../components/SeverityBadge';

interface DashboardPageProps {
  onSelectInspection: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectInspection,
  onNavigate,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recent, setRecent] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, recData] = await Promise.all([
        api.getDashboardSummary(),
        api.getRecentActivity(),
      ]);
      setSummary(sumData);
      setRecent(recData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
          <span className="text-xs font-medium text-slate-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const hasData = summary && summary.total_inspections > 0;

  // Prepare class distribution chart data
  const classChartData = summary?.class_distribution
    ? Object.entries(summary.class_distribution)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const classColors: Record<string, string> = {
    Pothole: '#dc2626',
    pothole: '#dc2626',
    Crack: '#059669',
    crack: '#059669',
    Rut: '#2563eb',
    rut: '#2563eb',
    Abscission: '#d97706',
    abscission: '#d97706',
    Undulation: '#9333ea',
    undulation: '#9333ea',
    Repair: '#0891b2',
    repair: '#0891b2',
    damage: '#e11d48',
    pothole_water: '#b91c1c',
    pothole_water_m: '#991b1b',
  };

  // Severity Chart Data
  const severityChartData = [
    { name: 'High', value: summary?.high_severity_detections || 0, color: '#dc2626' },
    { name: 'Medium', value: summary?.medium_severity_detections || 0, color: '#d97706' },
    { name: 'Low', value: summary?.low_severity_detections || 0, color: '#059669' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inspections"
          value={summary?.total_inspections || 0}
          subtitle={`${summary?.image_inspections || 0} Images • ${summary?.video_inspections || 0} Videos`}
          icon={Layers}
          accentColor="cyan"
        />
        <MetricCard
          title="Damage Instances"
          value={summary?.total_detections || 0}
          subtitle="Total defects identified"
          icon={Target}
          accentColor="blue"
        />
        <MetricCard
          title="High Severity Hazards"
          value={summary?.high_severity_detections || 0}
          subtitle="Immediate repair priority"
          icon={ShieldAlert}
          accentColor="rose"
        />
        <MetricCard
          title="Average Confidence"
          value={summary && summary.avg_confidence > 0 ? `${(summary.avg_confidence * 100).toFixed(1)}%` : '0%'}
          subtitle="Mean detector certainty"
          icon={Activity}
          accentColor="emerald"
        />
      </div>

      {!hasData ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-cyan-600 border border-slate-200 mb-4">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            No Road Inspections Performed Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            All analytics and KPI counters reflect completed inference runs. 
            Upload an image or video to launch your first road damage inspection.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onNavigate('image-inspect')}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-xs"
            >
              <Camera className="h-4 w-4" />
              <span>Inspect Image</span>
            </button>
            <button
              onClick={() => onNavigate('video-inspect')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Video className="h-4 w-4 text-cyan-600" />
              <span>Inspect Video</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Defect Class Distribution Bar Chart */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Defect Classification
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Damage Instances by Target Class
                  </h4>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {classChartData.reduce((acc, curr) => acc + curr.count, 0)} Total
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {classChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={classColors[entry.name] || '#0891b2'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Distribution Donut Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="border-b border-slate-200 pb-3 mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hazard Tier Analysis
                </span>
                <h4 className="text-sm font-semibold text-slate-800">
                  Severity Breakdown
                </h4>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                {severityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#cbd5e1',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#0f172a',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400">No severity instances</span>
                )}
              </div>

              {/* Legend */}
              <div className="mt-2 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                    <span className="text-slate-600 font-medium">High Severity</span>
                  </div>
                  <span className="font-mono text-slate-900 font-bold">{summary?.high_severity_detections || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-600 font-medium">Medium Severity</span>
                  </div>
                  <span className="font-mono text-slate-900 font-bold">{summary?.medium_severity_detections || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    <span className="text-slate-600 font-medium">Low Severity</span>
                  </div>
                  <span className="font-mono text-slate-900 font-bold">{summary?.low_severity_detections || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Recent Inspections
              </h4>

              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-medium text-cyan-700 hover:text-cyan-800 transition-colors"
              >
                View All History →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Filename / Source</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Total Defects</th>
                    <th className="px-4 py-2.5">Highest Severity</th>
                    <th className="px-4 py-2.5">Road Risk Score</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate">
                        {item.original_filename || item.filename}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.media_type === 'video' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        }`}>
                          {item.media_type === 'video' ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                          {item.media_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                        {new Date(item.created_at).toLocaleDateString()}
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
                        <button
                          onClick={() => onSelectInspection(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
