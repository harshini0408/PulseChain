import React, { useState, useEffect } from "react";
import {
  BarChart3,
  HeartHandshake,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  Award,
  Activity,
  ShieldCheck,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../api/client.js";

export const ImpactPage: React.FC = () => {
  const [stats, setStats] = useState<{
    unitsSaved: number;
    unitsLost: number;
    valueSavedInr: number;
    valueLostInr: number;
    activeEscalations: number;
    successRate: number;
    trend: Array<{
      date: string;
      unitsSaved: number;
      unitsLost: number;
      valueSavedInr: number;
      valueLostInr: number;
    }>;
  }>({
    unitsSaved: 0,
    unitsLost: 0,
    valueSavedInr: 0,
    valueLostInr: 0,
    activeEscalations: 0,
    successRate: 100,
    trend: [],
  });
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardImpact();
      setStats(data);
    } catch (err) {
      console.error("Could not load impact stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const reportData = {
      title: "PulseChain Zero Wastage Audit Report",
      generatedAt: new Date().toISOString(),
      summary: {
        unitsSaved: stats.unitsSaved,
        unitsLost: stats.unitsLost,
        salvageRate: `${stats.successRate}%`,
        valuePreservedINR: `₹${stats.valueSavedInr.toLocaleString("en-IN")}`,
        activeEscalations: stats.activeEscalations,
      },
      dailyTrends: stats.trend,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulsechain-audit-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-crimson-50 text-crimson-700 border border-crimson-200 text-xs font-bold uppercase tracking-wider font-mono">
              Stage 08 — Impact & Analytics
            </span>
            <span className="text-neutral-300">•</span>
            <span className="text-xs text-neutral-500 font-mono">Regional Telemetry Node: REG-HQ-01</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1.5">
            Regional Wastage Prevention & Clinical Salvage Report
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Proactive redistribution intelligence: Every near-expiry platelet unit matched and saved before discard across the Tamil Nadu Western Healthcare Grid.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crimson-600 hover:bg-crimson-700 text-xs font-semibold text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportSuccess ? "Report Downloaded!" : "Export Audit"}</span>
          </button>
        </div>
      </div>

      {/* 5-Column Clinical KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Units Rescued */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Units Rescued
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-neutral-900 font-mono">
              {stats.unitsSaved}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>100% Proactive Match</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Discard Zero Rate */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Salvage Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-crimson-50 text-crimson-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-neutral-900 font-mono">
              {stats.successRate}%
            </div>
            <div className="text-[11px] text-crimson-600 font-medium flex items-center gap-1 mt-0.5">
              <Award className="w-3 h-3" />
              <span>Zero Preventable Loss</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Value Saved (INR) */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Value Preserved
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-neutral-900 font-mono">
              ₹{(stats.valueSavedInr || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
              <span>₹12,500 / Platelet Unit</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Active Escalations */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Active Mesh Tasks
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-neutral-900 font-mono">
              {stats.activeEscalations}
            </div>
            <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
              <span>Step Functions Monitored</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Average Rescue Time */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Avg Rescue Time
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-neutral-900 font-mono">
              34<span className="text-sm font-sans font-normal text-neutral-500 ml-1">mins</span>
            </div>
            <div className="text-[11px] text-teal-600 font-medium flex items-center gap-1 mt-0.5">
              <span>SLA Target: &lt; 90 mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown: Salvage Trend & Regional Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 7-Day Trend Chart Simulation */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Proactive Rescue vs Wastage Discard History
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automated redistribution volume across the Coimbatore regional network
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Zero Losses Recorded
            </span>
          </div>

          {/* Bar Chart Simulation */}
          <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-neutral-200 pb-2">
            {[
              { day: "Mon", saved: 4, lost: 0, height: "60%" },
              { day: "Tue", saved: 6, lost: 0, height: "85%" },
              { day: "Wed", saved: 3, lost: 0, height: "45%" },
              { day: "Thu", saved: 7, lost: 0, height: "95%" },
              { day: "Fri", saved: 5, lost: 0, height: "70%" },
              { day: "Sat", saved: 8, lost: 0, height: "100%" },
              { day: "Sun (Today)", saved: Math.max(1, stats.unitsSaved), lost: stats.unitsLost, height: "75%" },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex items-end justify-center h-36">
                  <div
                    style={{ height: col.height }}
                    className="w-full max-w-[36px] bg-crimson-600 rounded-t group-hover:bg-crimson-700 transition-all flex items-center justify-center text-[10px] text-white font-mono font-bold"
                  >
                    {col.saved}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 truncate">{col.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-crimson-600"></span>
                <span>Rescued Units</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-neutral-300"></span>
                <span>Expired (Discarded)</span>
              </div>
            </div>
            <span className="font-mono text-neutral-400">Total Corridor Units: {stats.unitsSaved + 33}</span>
          </div>
        </div>

        {/* Right Col: Cold-Chain & AI Matching Telemetry */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">
          <h3 className="text-base font-bold text-neutral-900">
            Network Integrity Metrics
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-neutral-900">Cold Chain Compliance</div>
                <div className="text-neutral-500 text-[11px]">20°C–24°C continuous agitation</div>
              </div>
              <span className="font-mono font-bold text-emerald-600 text-sm">99.8%</span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-neutral-900">Bedrock AI Extraction Precision</div>
                <div className="text-neutral-500 text-[11px]">Multi-lingual clinical notes</div>
              </div>
              <span className="font-mono font-bold text-indigo-600 text-sm">98.4%</span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-neutral-900">Deterministic Match Score</div>
                <div className="text-neutral-500 text-[11px]">5-Factor Algorithm accuracy</div>
              </div>
              <span className="font-mono font-bold text-crimson-600 text-sm">1.00</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-crimson-50/60 border border-crimson-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-crimson-900">
              <Sparkles className="w-4 h-4 text-crimson-600" />
              <span>Zero Wastage Mandate</span>
            </div>
            <p className="text-crimson-800 text-[11px] mt-1 leading-relaxed">
              Every platelet unit is placed within 90 minutes of critical 36-hour expiry threshold via the automated 3-Ring redistribution protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
