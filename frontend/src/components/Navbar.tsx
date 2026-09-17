import React from "react";
import {
  Package,
  Inbox,
  FileText,
  Truck,
  Radio,
  BarChart3,
  Building2,
  Activity,
  Layers,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../auth/context.js";

export type NavTab = "stock" | "offers" | "requisitions" | "transfers" | "escalations" | "impact";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { role, facilityId, facilityName, switchPersona, facilities } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 bg-neutral-900 border-r border-neutral-850 flex flex-col justify-between text-neutral-300 select-none min-h-screen">
      <div>
        {/* Top Brand Section */}
        <div className="p-5 border-b border-neutral-800">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab("impact")}>
            <div className="w-9 h-9 rounded-lg bg-crimson-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-crimson-950/50">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.5C12 2.5 6 11 6 15.5A6 6 0 0 0 18 15.5C18 11 12 2.5 12 2.5Z" />
                <circle cx="12" cy="15.5" r="2.2" fill="#FFFFFF" />
                <path d="M8.5 15.5h2M13.5 15.5h2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-base tracking-wider leading-none">
                  PULSE<span className="text-crimson-400">CHAIN</span>
                </span>
                <span className="text-[9px] font-semibold bg-crimson-900/80 text-crimson-200 border border-crimson-700/50 px-1 py-0.5 rounded font-mono">
                  v2.4
                </span>
              </div>
              <span className="text-[10px] tracking-wide text-neutral-400 uppercase font-medium block mt-1">
                Zero Blood Wastage Network
              </span>
            </div>
          </div>

          {/* Node Status Pill */}
          <div className="mt-4 px-2.5 py-1.5 rounded-md bg-neutral-850 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-medium text-neutral-200">Regional Node Online</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">12ms</span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="px-3 py-4 space-y-5 text-xs">
          {/* Group 1: Blood Centre Operations */}
          <div className="space-y-1">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Blood Centre Hub
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                CBE-01
              </span>
            </div>

            <button
              onClick={() => onSelectTab("stock")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "stock"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Package className="w-4 h-4" />
                <span>Stock Console</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Ledger
              </span>
            </button>
          </div>

          {/* Group 2: Hospital Operations */}
          <div className="space-y-1">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Hospital Operations
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                CBE-HOSP
              </span>
            </div>

            <button
              onClick={() => onSelectTab("offers")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "offers"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Inbox className="w-4 h-4" />
                <span>Offer Inbox</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-crimson-900 text-crimson-200">
                Rescue
              </span>
            </button>

            <button
              onClick={() => onSelectTab("requisitions")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "requisitions"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4" />
                <span>Requisitions (AI)</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Demand
              </span>
            </button>

            <button
              onClick={() => onSelectTab("transfers")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "transfers"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Truck className="w-4 h-4" />
                <span>Transfers & Logistics</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Cold Chain
              </span>
            </button>
          </div>

          {/* Group 3: Regional Coordination & Analytics */}
          <div className="space-y-1">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Regional Grid
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                AWS SFN
              </span>
            </div>

            <button
              onClick={() => onSelectTab("escalations")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "escalations"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Radio className="w-4 h-4" />
                <span>Escalation Radar</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                3-Ring
              </span>
            </button>

            <button
              onClick={() => onSelectTab("impact")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "impact"
                  ? "bg-crimson-600 text-white shadow-sm"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Impact Analytics</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Report
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom User & Facility Persona Selector */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950/60">
        <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
          Active Role Context
        </div>
        <select
          value={`${role}__${facilityId}`}
          onChange={(e) => {
            const [newRole, newFacId] = e.target.value.split("__");
            const matched = facilities.find((f) => f.facilityId === newFacId);
            switchPersona(
              newRole as any,
              newFacId,
              matched ? matched.name : newFacId
            );
          }}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white font-medium focus:ring-1 focus:ring-crimson-500 cursor-pointer"
        >
          <option value="BLOOD_CENTRE__CBE-BC-01">🩸 CBE Central Blood Centre</option>
          <option value="HOSPITAL__CBE-HOSP-04">🏥 Coimbatore East Hospital (8.4 km)</option>
          <option value="HOSPITAL__TUP-HOSP-01">🏥 Tiruppur General Hospital (43.3 km)</option>
          <option value="COORDINATOR__REGIONAL-COORDINATOR">🎯 Regional Network Coordinator</option>
        </select>
        <div className="mt-2 text-[11px] text-neutral-400 truncate">
          Active: <span className="text-white font-semibold">{facilityName}</span>
        </div>
      </div>
    </aside>
  );
};

interface HeaderBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ activeTab }) => {
  const { facilityId, facilityName } = useAuth();

  const titleMap: Record<NavTab, string> = {
    stock: "01 — Stock Console & Expiry Ledger",
    offers: "02 — Hospital Redistribution Inbox",
    requisitions: "03 — Blood Requisitions & AI Demand Intake",
    transfers: "04 — Transfers & Cold-Chain Logistics Tracking",
    escalations: "05 — 3-Ring Step Functions Escalation Radar",
    impact: "06 — Wastage Prevention & Impact Analytics",
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between text-neutral-900 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <h1 className="text-sm font-bold text-neutral-900">{titleMap[activeTab]}</h1>
        <span className="text-neutral-300">•</span>
        <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono font-medium">
          Facility: {facilityId}
        </span>
      </div>

      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
          <Building2 className="w-3.5 h-3.5 text-crimson-600" />
          <span>{facilityName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Node</span>
        </div>
      </div>
    </header>
  );
};
