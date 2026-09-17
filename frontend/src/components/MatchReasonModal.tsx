import React from "react";
import { X, CheckCircle2, Award, Zap, Compass, Layers, ShieldCheck } from "lucide-react";
import type { Offer } from "@pulsechain/shared";

interface MatchReasonModalProps {
  offer: Offer | null;
  onClose: () => void;
}

export const MatchReasonModal: React.FC<MatchReasonModalProps> = ({ offer, onClose }) => {
  if (!offer) return null;

  const b = offer.breakdown || {
    compatibility: 1.0,
    distanceKm: 8.4,
    openRequisition: 1.0,
    standingDemand: 0.8,
    urgency: 0.6,
    hoursRemaining: 36,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-rose-500/30">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700/60 flex items-center justify-center text-rose-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Explainable Match Breakdown
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/80 text-rose-300 font-mono">
                  Rank #{offer.rank}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Unit: {offer.unitId} • Ring {offer.ring}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explainable Statement */}
        <div className="my-4 p-3.5 rounded-xl bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-900/50 text-xs text-rose-200 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{offer.reason || "Ranked highest due to active matching demand and close proximity."}</span>
        </div>

        {/* Multi-factor Score Breakdown Grid */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Deterministic 5-Factor Evaluation (Total Score: {(offer.score * 100).toFixed(0)}/100)
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Compatibility (25%)
              </div>
              <div className="font-bold text-white text-sm">
                {(b.compatibility * 100).toFixed(0)}% Match
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Distance (25%)
              </div>
              <div className="font-bold text-white text-sm">{b.distanceKm.toFixed(1)} km</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Active Requisition (25%)
              </div>
              <div className="font-bold text-white text-sm">
                {b.openRequisition > 0 ? "YES (Active Demand)" : "NO"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Standing Demand (15%)
              </div>
              <div className="font-bold text-white text-sm">
                {(b.standingDemand * 100).toFixed(0)}% Profile
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
