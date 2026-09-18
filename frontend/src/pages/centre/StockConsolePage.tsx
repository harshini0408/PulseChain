import React from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useStockQuery } from "../../api/hooks";
import { StockTable } from "../../components/stock/StockTable";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Droplets, Activity, CheckCircle2, AlertCircle } from "lucide-react";

export function StockConsolePage() {
  const { user, facilityId, facilityName } = useAuth();
  const effectiveFacilityId = facilityId ?? "FAC_CBE_SNBC";

  const { data: units, isLoading, isError, error, refetch } = useStockQuery(effectiveFacilityId);

  const pendingRescueCount = units?.filter((u) => u.status === "RESCUE_PENDING").length ?? 0;
  const claimedCount = units?.filter((u) => u.status === "CLAIMED").length ?? 0;
  const nearExpiryCount =
    units?.filter(
      (u) =>
        u.status === "AVAILABLE" &&
        u.hoursRemaining <= (u.component === "PLATELETS" ? 48 : 168),
    ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with Title and Facility Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Stock Console
            </h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {facilityName ?? "SNS Blood Centre, Coimbatore"} • Real-time inventory & rescue status
          </p>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="flex items-center gap-3">
          {pendingRescueCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>{pendingRescueCount} Rescue Brokering</span>
            </div>
          )}
          {claimedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{claimedCount} Claimed</span>
            </div>
          )}
          <div className="text-xs text-slate-400 font-medium">
            Total Units: <span className="font-bold text-slate-800 dark:text-slate-200">{units?.length ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Content State */}
      {isLoading ? (
        <LoadingState message="Loading live blood unit inventory..." />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? "Failed to fetch stock"}
          onRetry={() => refetch()}
        />
      ) : !units || units.length === 0 ? (
        <EmptyState
          icon={<Droplets className="w-8 h-8 text-slate-400" />}
          title="No Blood Units Stored"
          message="No units registered under this facility. Click 'Reset demo data' in the toolbar to populate inventory."
        />
      ) : (
        <StockTable units={units} />
      )}
    </div>
  );
}
