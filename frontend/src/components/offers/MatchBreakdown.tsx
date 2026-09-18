import React, { useState } from "react";
import type { MatchBreakdown as MatchBreakdownType } from "@pulsechain/shared";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

interface MatchBreakdownProps {
  score: number;
  breakdown: MatchBreakdownType;
}

export const MatchBreakdown: React.FC<MatchBreakdownProps> = ({ score, breakdown }) => {
  const [expanded, setExpanded] = useState(false);

  // Normalize score display to 0-100 scale
  const displayScore = score <= 1 ? Math.round(score * 100) : Math.round(score);

  const factors = [
    {
      name: "Compatibility",
      val: breakdown.compatibility,
      detail: `Score: ${(breakdown.compatibility * 100).toFixed(0)}%`,
    },
    {
      name: "Urgency",
      val: breakdown.urgency,
      detail: `${breakdown.hoursRemaining?.toFixed(1) ?? "?"}h remaining`,
    },
    {
      name: "Proximity",
      val: 1 - Math.min(1, (breakdown.distanceKm ?? 0) / 50),
      detail: `${breakdown.distanceKm?.toFixed(1) ?? "?"} km transit`,
    },
    {
      name: "Requisition Match",
      val: breakdown.openRequisition,
      detail: breakdown.openRequisition > 0 ? "Active matched req" : "General demand",
    },
    {
      name: "Standing Demand",
      val: breakdown.standingDemand,
      detail: `Score: ${(breakdown.standingDemand * 100).toFixed(0)}%`,
    },
  ];

  return (
    <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Match Score Breakdown</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono font-bold text-[11px]">
            {displayScore}/100
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>{expanded ? "Hide factors" : "View 5 factors"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Engine Factor Weights & Stored Values (Verified)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {factors.map((f) => (
              <div key={f.name} className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-300 font-medium">{f.name}</span>
                <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
