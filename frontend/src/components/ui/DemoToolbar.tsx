/**
 * frontend/src/components/ui/DemoToolbar.tsx
 *
 * Persistent toolbar displaying active role & facility, quick persona switcher,
 * "Run sweep now" action with live spinner & result summary, and "Reset demo data" action.
 */

import React, { useState } from "react";
import { useAuth, DEMO_PERSONAS, type Role } from "../../auth/AuthProvider";
import { useSweepMutation, useResetMutation } from "../../api/hooks";
import { Play, RotateCcw, User, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export const DemoToolbar: React.FC = () => {
  const { user, role, facilityName, loginAs } = useAuth();
  const sweepMutation = useSweepMutation();
  const resetMutation = useResetMutation();

  const [sweepNotice, setSweepNotice] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleSweep = async () => {
    setSweepNotice(null);
    try {
      const res = await sweepMutation.mutateAsync();
      const unitSummary = res.units.length > 0 ? ` (${res.units.length} units swept)` : " (0 new units)";
      setSweepNotice(`Sweep completed: ${res.sweptCount} items evaluated${unitSummary}`);
      setTimeout(() => setSweepNotice(null), 6000);
    } catch (err: any) {
      setSweepNotice(`Sweep error: ${err.message}`);
    }
  };

  const handleReset = async () => {
    setResetConfirmOpen(false);
    try {
      const res = await resetMutation.mutateAsync();
      setSweepNotice(`Reset complete: ${res.actualCount} items verified in ${res.elapsedSec}s`);
      setTimeout(() => setSweepNotice(null), 6000);
    } catch (err: any) {
      setSweepNotice(`Reset error: ${err.message}`);
    }
  };

  const roleBadgeColors: Record<Role, string> = {
    BLOOD_CENTRE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
    HOSPITAL: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    COORDINATOR: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    COMMUNITY_COORDINATOR: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
    DONOR: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
  };

  return (
    <>
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm sticky top-0 z-50">
        {/* Left: Current Persona and Facility */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            Demo Persona:
          </span>
          {role && (
            <span
              className={`px-2 py-0.5 text-[11px] font-bold rounded border uppercase tracking-wider ${roleBadgeColors[role]}`}
            >
              {role.replace("_", " ")}
            </span>
          )}
          <span className="font-semibold text-white truncate max-w-xs md:max-w-md">
            {facilityName ?? "Unassigned Facility"}
          </span>
        </div>

        {/* Center: Feedback Notice */}
        {sweepNotice && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/80 border border-blue-700 text-blue-200 rounded text-xs animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="truncate max-w-sm">{sweepNotice}</span>
          </div>
        )}

        {/* Right: Controls & Persona Switch */}
        <div className="flex items-center gap-2">
          {/* Quick Switch Dropdown */}
          <select
            aria-label="Switch User Persona"
            value={role ?? ""}
            onChange={(e) => loginAs(e.target.value as Role)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="BLOOD_CENTRE">Centre: SNS Blood Centre</option>
            <option value="HOSPITAL">Hospital: KMCH Coimbatore</option>
            <option value="COORDINATOR">Coord: Regional Centre</option>
            <option value="COMMUNITY_COORDINATOR">Community: SIRT</option>
            <option value="DONOR">Donor: Prakash</option>
          </select>

          {/* Sweep Button */}
          <button
            onClick={handleSweep}
            disabled={sweepMutation.isPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded transition-colors"
            title="Execute sweep worker immediately against DynamoDB"
          >
            {sweepMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{sweepMutation.isPending ? "Sweeping..." : "Run sweep now"}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetMutation.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded transition-colors"
            title="Wipe and reload table with clean seed state"
          >
            {resetMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <RotateCcw className="w-3 h-3 text-slate-400" />
            )}
            <span>{resetMutation.isPending ? "Resetting..." : "Reset demo data"}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-bold">Reset Demo Table?</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              This will wipe all live data in the DynamoDB table and reload the seed inventory
              with the two staged demo units in ~5 seconds.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-sm transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
