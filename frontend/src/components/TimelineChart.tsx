import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface TimelinePoint {
  frame: number;
  time_sec: number;
  risk_score: number;
  defect_count: number;
  high_count: number;
}

interface TimelineChartProps {
  timeline: TimelinePoint[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-400">
        No frame telemetry data available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Risk & Defect Timeline
          </h4>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-600" />
            <span className="text-slate-600">Smoothed Risk Score</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-slate-600">Active Defects</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time_sec"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => `${val}s`}
            />
            <YAxis
              yAxisId="risk"
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => `${val}`}
            />
            <YAxis
              yAxisId="defects"
              orientation="right"
              stroke="#64748b"
              fontSize={11}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0f172a',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelFormatter={(val) => `Time: ${val}s`}
            />
            <ReferenceLine
              yAxisId="risk"
              y={70}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: 'Danger (≥70)', fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              yAxisId="risk"
              y={30}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: 'Caution (≥30)', fill: '#d97706', fontSize: 10, position: 'insideTopRight' }}
            />
            <Line
              yAxisId="risk"
              type="monotone"
              dataKey="risk_score"
              stroke="#0891b2"
              strokeWidth={2}
              dot={false}
              name="Risk Score"
            />
            <Line
              yAxisId="defects"
              type="stepAfter"
              dataKey="defect_count"
              stroke="#d97706"
              strokeWidth={1.5}
              dot={false}
              name="Defect Count"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
