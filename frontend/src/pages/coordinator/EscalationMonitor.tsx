import React, { useState, useEffect } from "react";
import {
  Radio,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldAlert,
  Clock,
  Compass,
  Building2,
  Users,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import type { Escalation } from "@pulsechain/shared";
import { api } from "../../api/client.js";

export const EscalationMonitor: React.FC = () => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);

  const loadEscalations = async () => {
    setLoading(true);
    try {
      const items = await api.getActiveEscalations();
      setEscalations(items);
      if (items.length > 0 && !selectedEscalation) {
        setSelectedEscalation(items[0]);
      }
    } catch (err) {
      console.error("Could not load escalations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscalations();
    const interval = setInterval(loadEscalations, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Regional Escalation Orchestrator
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-crimson-50 text-crimson-700 border border-crimson-200 font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-crimson-600 animate-pulse"></span>
              AWS Step Functions 3-Ring Mesh
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Autonomous tiered radius expansion engine (0–10 km → 10–30 km → 30–100+ km → Community Donor Pools) preventing platelet & blood wastage across the Coimbatore–Tiruppur–Erode–Salem healthcare corridor.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={loadEscalations}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Radar</span>
          </button>
        </div>
      </div>

      {/* 3-Ring Visual Pipeline Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between font-bold text-crimson-700 mb-1">
            <span className="text-xs">Ring 1: Immediate Hubs</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-crimson-50 border border-crimson-200">
              0–10 km
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            Target local city hospitals with active standing demand or open requisitions (90s claim window).
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>Timeout: 90s</span>
            <span className="text-crimson-600 font-semibold">Weight: 1.00</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between font-bold text-amber-700 mb-1">
            <span className="text-xs">Ring 2: Sub-Regional</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
              10–30 km
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            Surrounding taluk centers & partner clinics along regional highway corridors (120s claim window).
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>Timeout: 120s</span>
            <span className="text-amber-600 font-semibold">Weight: 0.85</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between font-bold text-indigo-700 mb-1">
            <span className="text-xs">Ring 3: Inter-City</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200">
              30–100+ km
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            Major tertiary multi-specialty hospitals in neighboring cities (Tiruppur, Erode, Salem).
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>Timeout: 180s</span>
            <span className="text-indigo-600 font-semibold">Weight: 0.70</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between font-bold text-teal-700 mb-1">
            <span className="text-xs">Tier 4: Donor Pools</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200">
              Fallback
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            College & corporate donor pool dispatch (PSG iTech, Lions Club) for emergency fresh replacement.
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>Broadcast: SES/SMS</span>
            <span className="text-teal-600 font-semibold">Auto-Replenish</span>
          </div>
        </div>
      </div>

      {/* Main Radar & Active Executions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Executions List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-crimson-600" />
              <span>Active Escalations ({escalations.length})</span>
            </h3>
            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
              Live AWS SFN
            </span>
          </div>

          {escalations.length === 0 && !loading ? (
            <div className="p-8 text-center bg-neutral-50 rounded-xl border border-neutral-200/80">
              <Layers className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-neutral-700">No Running Escalations</div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Near-expiry units undergoing tiered redistribution will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {escalations.map((esc) => {
                const isSelected = selectedEscalation?.escalationId === esc.escalationId;
                return (
                  <div
                    key={esc.escalationId}
                    onClick={() => setSelectedEscalation(esc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-crimson-50/50 border-crimson-400 shadow-sm"
                        : "bg-white border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 font-mono">
                        {esc.escalationId}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-crimson-100 text-crimson-800">
                        RING {esc.currentRing || 1}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 mt-1 flex items-center justify-between">
                      <span>Target: <strong className="text-neutral-700">{esc.subjectId}</strong></span>
                      <span>{new Date(esc.startedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Radar & Stage Progression */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {selectedEscalation ? `Radar Breakdown: ${selectedEscalation.escalationId}` : "Escalation Visualizer"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Multi-hop broadcast telemetry across regional medical centers
              </p>
            </div>

            {selectedEscalation && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                State Machine Running
              </span>
            )}
          </div>

          {/* Interactive Radar Visual Canvas */}
          <div className="p-6 rounded-2xl bg-neutral-900 text-white relative overflow-hidden min-h-[280px] flex flex-col justify-between">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-crimson-400" />
                <span className="font-semibold text-neutral-200">Network Topology Scan</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">Hub: CBE-BC-01 (Coimbatore)</span>
            </div>

            {/* Radar Node Visualizer */}
            <div className="relative z-10 my-8 flex items-center justify-between px-4 sm:px-8">
              {/* Central Source Node */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-crimson-600 border-4 border-crimson-900 flex items-center justify-center text-white shadow-lg shadow-crimson-950">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-neutral-300 mt-2">Blood Centre</span>
                <span className="text-[9px] font-mono text-neutral-400">Source</span>
              </div>

              {/* Connecting Line 1 */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-crimson-600 to-amber-500 mx-2 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-400 bg-neutral-800 px-1 rounded">
                  8.4 km
                </div>
              </div>

              {/* Ring 1 Node */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-600 border-2 border-amber-400 flex items-center justify-center text-white shadow">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-amber-300 mt-2">CBE-HOSP-04</span>
                <span className="text-[9px] font-mono text-neutral-400">Ring 1</span>
              </div>

              {/* Connecting Line 2 */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500 to-indigo-500 mx-2 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-400 bg-neutral-800 px-1 rounded">
                  43.3 km
                </div>
              </div>

              {/* Ring 2/3 Node */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-indigo-400 flex items-center justify-center text-white shadow">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 mt-2">TUP-HOSP-01</span>
                <span className="text-[9px] font-mono text-neutral-400">Ring 2</span>
              </div>

              {/* Connecting Line 3 */}
              <div className="flex-1 h-0.5 bg-gradient-to-r from-indigo-500 to-teal-500 mx-2 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-400 bg-neutral-800 px-1 rounded">
                  Donor Tier
                </div>
              </div>

              {/* Donor Pool Node */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-teal-600 border-2 border-teal-400 flex items-center justify-center text-white shadow">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-teal-300 mt-2">PSG iTech Pool</span>
                <span className="text-[9px] font-mono text-neutral-400">Fallback</span>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800 pt-3">
              <span>Dynamic Routing: Haversine Geo-ranking + Urgency Multiplier</span>
              <span className="text-emerald-400 font-mono">Cold-Chain Agitator: ACTIVE</span>
            </div>
          </div>

          {/* Fallback Donor Pools Overview */}
          <div className="border-t border-neutral-200 pt-4">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
              Registered Emergency Donor Pools (Tier 4 Network)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">PSG iTech NSS Volunteer Pool</div>
                  <div className="text-[11px] text-neutral-500">Neelambur, Coimbatore • 42 Donors Ready</div>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200 font-mono">
                  O-, B-, AB-
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Lions Club Regional Donor Registry</div>
                  <div className="text-[11px] text-neutral-500">Tiruppur City Hub • 28 Platelet Donors</div>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200 font-mono">
                  All Groups
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
