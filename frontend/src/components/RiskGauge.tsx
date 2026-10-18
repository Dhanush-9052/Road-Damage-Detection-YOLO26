import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Info } from 'lucide-react';
import type { RiskAssessment } from '../types';

interface RiskGaugeProps {
  risk: RiskAssessment;
  defectCount?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, defectCount = 0 }) => {
  const score = risk.score;

  let statusBadge = {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: CheckCircle2,
    barColor: 'bg-emerald-500',
    text: 'SAFE (LOW RISK)',
  };

  if (score > 70) {
    statusBadge = {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: ShieldAlert,
      barColor: 'bg-rose-500',
      text: 'DANGER (CRITICAL RISK)',
    };
  } else if (score > 30) {
    statusBadge = {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      barColor: 'bg-amber-500',
      text: 'CAUTION (MODERATE RISK)',
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Aggregate Road Risk Index
          </span>
          <h3 className="text-lg font-bold text-slate-900">Surface Condition Assessment</h3>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${statusBadge.bg}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{statusBadge.text}</span>
        </div>
      </div>

      {/* Main Score & Progress Bar */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Number Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight text-slate-900">
            {score.toFixed(1)}
          </span>
          <span className="text-xl font-medium text-slate-400">/ 100</span>
          <div className="ml-auto md:ml-4 text-right md:text-left">
            <span className="text-xs text-slate-500 block">Identified Defects</span>
            <span className="text-lg font-bold text-cyan-700">{defectCount}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span className="text-emerald-600">0 - Safe</span>
            <span className="text-amber-600">30 - Caution</span>
            <span className="text-rose-600">70 - Danger</span>
            <span>100</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200 p-0.5">
            <div
              className={`h-full rounded-full ${statusBadge.barColor} transition-all duration-500 ease-out`}
              style={{ width: `${Math.max(3, Math.min(100, score))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Civil Engineering Advisory Box */}
      <div className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50/60 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold tracking-wider text-cyan-900 uppercase">
              Civil Inspection Advisory
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {risk.advisory}
            </p>
          </div>
        </div>
      </div>

      {/* Contributing Factors */}
      {risk.factors && risk.factors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Primary Risk Factors:
          </span>
          <div className="flex flex-wrap gap-2">
            {risk.factors.map((factor, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                • {factor}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
