import React from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useInboxQuery, useStockQuery, useFacilitiesQuery } from "../../api/hooks";
import { TransferTimeline } from "../../components/transfers/TransferTimeline";
import { TransferActions } from "../../components/transfers/TransferActions";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Truck, Building2, MapPin, CheckCircle2 } from "lucide-react";

const KNOWN_FACILITIES: Record<string, string> = {
  FAC_CBE_SNBC: "Coimbatore SNS Blood Centre",
  FAC_CBE_KMCH: "Kovai Medical Centre and Hospital",
  FAC_CBE_GKNM: "G. Kuppuswamy Naidu Memorial Hospital",
  FAC_CBE_PSG: "PSG Hospitals, Peelamedu",
  FAC_CBE_RAMA: "Sri Ramakrishna Hospital",
  FAC_CBE_ROYAL: "Royal Care Super Speciality Hospital",
};

export function TransfersPage() {
  const { facilityId, facilityName } = useAuth();
  const effectiveFacilityId = facilityId ?? "FAC_CBE_KMCH";

  const { data: offers, isLoading: inboxLoading, isError: inboxError, refetch: refetchInbox } =
    useInboxQuery(effectiveFacilityId);
  const { data: stock, isLoading: stockLoading, refetch: refetchStock } =
    useStockQuery(effectiveFacilityId);
  const { data: facilities } = useFacilitiesQuery();

  const facilityMap = React.useMemo(() => {
    const map: Record<string, string> = { ...KNOWN_FACILITIES };
    if (facilities) {
      for (const f of facilities) {
        map[f.facilityId] = f.name;
      }
    }
    return map;
  }, [facilities]);

  // Find transfers from claimed/in-transit offers
  const claimedOffers = offers?.filter((o) => o.status === "CLAIMED") ?? [];
  const receivedStockUnits = stock?.filter((u) => u.status === "RECEIVED") ?? [];

  // Combine for unique transfers
  const transferItems = React.useMemo(() => {
    const items: Array<{
      unitId: string;
      component: string;
      bloodGroup: string;
      volumeMl: number;
      originFacilityId: string;
      distanceKm?: number;
      status: string;
    }> = [];

    const seenUnits = new Set<string>();

    for (const off of claimedOffers) {
      if (!seenUnits.has(off.unitId)) {
        seenUnits.add(off.unitId);
        items.push({
          unitId: off.unitId,
          component: off.component ?? "PLATELETS",
          bloodGroup: off.bloodGroup ?? "O+",
          volumeMl: off.volumeMl ?? 250,
          originFacilityId: off.originFacilityId,
          distanceKm: off.breakdown?.distanceKm,
          status: "CLAIMED",
        });
      }
    }

    for (const unit of receivedStockUnits) {
      if (!seenUnits.has(unit.unitId)) {
        seenUnits.add(unit.unitId);
        items.push({
          unitId: unit.unitId,
          component: unit.component,
          bloodGroup: unit.bloodGroup,
          volumeMl: unit.volumeMl,
          originFacilityId: "FAC_CBE_SNBC",
          status: "RECEIVED",
        });
      }
    }

    return items;
  }, [claimedOffers, receivedStockUnits]);

  const isLoading = inboxLoading && stockLoading;

  const handleRefresh = () => {
    refetchInbox();
    refetchStock();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Transfers & Delivery
            </h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {facilityName ?? "Kovai Medical Centre and Hospital"} • Courier transit tracking and receipt confirmation
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
          Active Transfers: <span className="font-bold text-slate-900 dark:text-white">{transferItems.length}</span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading hospital transfers..." />
      ) : inboxError ? (
        <ErrorState message="Failed to load transfers" onRetry={handleRefresh} />
      ) : transferItems.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-10 h-10 text-slate-400" />}
          title="No active transfers"
          message="When you claim a blood unit from the offer inbox, it will appear here for courier dispatch and hospital receipt confirmation."
        />
      ) : (
        <div className="space-y-4 max-w-4xl">
          {transferItems.map((item) => {
            const originName = facilityMap[item.originFacilityId] ?? item.originFacilityId;

            return (
              <div
                key={item.unitId}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
              >
                {/* Unit Details Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs">
                      {item.bloodGroup}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.component} ({item.volumeMl} ml)
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Origin: {originName}</span>
                        {item.distanceKm !== undefined && (
                          <>
                            <span>•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{item.distanceKm.toFixed(1)} km</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs text-slate-400">
                    Unit ID: {item.unitId}
                  </span>
                </div>

                {/* Status Timeline */}
                <div className="py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <TransferTimeline status={item.status} />
                </div>

                {/* Transfer Action Controls */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <TransferActions
                    unitId={item.unitId}
                    status={item.status}
                    onSuccess={handleRefresh}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
