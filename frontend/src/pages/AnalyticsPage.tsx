import React, { useEffect, useState } from 'react';
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
import {
  ShieldAlert,
  Target,
  Sparkles,
  Eye,
  Layers
} from 'lucide-react';

import { api } from '../services/api';
import type { DashboardSummary, InspectionListItem } from '../types';
import { MetricCard } from '../components/MetricCard';
import { SeverityBadge } from '../components/SeverityBadge';

interface AnalyticsPageProps {
  onSelectInspection: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  onSelectInspection,
  onNavigate,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [highRiskItems, setHighRiskItems] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sum, rec] = await Promise.all([
          api.getDashboardSummary(),
          api.getInspections({ limit: 100, severity: 'High' }),
        ]);
        setSummary(sum);
        setHighRiskItems(rec.items);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
          <span className="text-xs font-medium text-slate-500">Aggregating Municipal Analytics...</span>
        </div>
      </div>
    );
  }

  const hasData = summary && summary.total_inspections > 0;

  const classData = summary?.class_distribution
    ? Object.entries(summary.class_distribution)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const mediaTypeData = [
    { name: 'Images', value: summary?.image_inspections || 0, color: '#0891b2' },
    { name: 'Videos', value: summary?.video_inspections || 0, color: '#9333ea' },
  ].filter((d) => d.value > 0);

  const riskBandData = [
    { name: 'Safe (≤30)', value: summary?.risk_distribution?.['Low'] || 0, color: '#059669' },
    { name: 'Caution (31-70)', value: summary?.risk_distribution?.['Medium'] || 0, color: '#d97706' },
    { name: 'Danger (>70)', value: summary?.risk_distribution?.['High'] || 0, color: '#dc2626' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Inspection Analytics & Distribution Trends
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregate statistics compiled from completed road inspections
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-50 px-2.5 py-1 text-xs text-slate-600 border border-slate-200 font-mono">
              Total Records: {summary?.total_inspections || 0}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Defects"
          value={summary?.total_detections || 0}
          subtitle="Identified road surface flaws"
          icon={Target}
          accentColor="blue"
        />
        <MetricCard
          title="Critical Hazards"
          value={summary?.high_severity_detections || 0}
          subtitle="Priority repairs (S ≥ 0.65)"
          icon={ShieldAlert}
          accentColor="rose"
        />
        <MetricCard
          title="Mean Road Risk"
          value={summary ? `${summary.avg_risk_score.toFixed(1)} / 100` : '0'}
          subtitle="Average pavement risk score"
          icon={Sparkles}
          accentColor="amber"
        />
        <MetricCard
          title="Mean Model Confidence"
          value={summary && summary.avg_confidence > 0 ? `${(summary.avg_confidence * 100).toFixed(1)}%` : '0%'}
          subtitle="Detector certainty metric"
          icon={Sparkles}
          accentColor="emerald"
        />
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            No Analytics Available Yet
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Upload images or videos to build the historical database and view pavement condition analytics.
          </p>
          <button
            onClick={() => onNavigate('image-inspect')}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 transition-colors shadow-xs"
          >
            Start First Inspection
          </button>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Defect Class Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Class Frequency
              </span>
              <h4 className="text-sm font-semibold text-slate-800 mb-4">
                Total Instances per Defect Class
              </h4>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
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
                    <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Category Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Risk Distribution
              </span>
              <h4 className="text-sm font-semibold text-slate-800 mb-4">
                Inspections by Pavement Risk Level
              </h4>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskBandData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskBandData.map((entry, index) => (
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
              </div>

              <div className="flex justify-around border-t border-slate-200 pt-3 text-xs">
                {riskBandData.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-slate-600">{r.name}:</span>
                    <span className="font-mono font-bold text-slate-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Media Modality Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mediaTypeData.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-cyan-600 border border-slate-200">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">{m.name} Processed</span>
                    <span className="text-[11px] text-slate-500">Total verified inspections</span>
                  </div>
                </div>
                <span className="text-2xl font-bold font-mono text-cyan-700">{m.value}</span>
              </div>
            ))}
          </div>

          {/* High-Risk Priority Incidents Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Critical Hazard Inspections (High Severity)
                </h4>
              </div>
              <span className="text-xs font-mono text-rose-600 font-bold">
                {highRiskItems.length} Incidents
              </span>
            </div>

            {highRiskItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No high-severity inspections logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Filename</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Detections</th>
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">Risk Score</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {highRiskItems.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate">
                          {item.original_filename || item.filename}
                        </td>
                        <td className="px-4 py-2.5 uppercase text-[10px] font-semibold text-slate-500">
                          {item.media_type}
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
                        <td className="px-4 py-2.5 font-mono font-bold text-rose-600">
                          {item.risk_score.toFixed(1)} / 100
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => onSelectInspection(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
