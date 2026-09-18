import React from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useInboxQuery, useFacilitiesQuery } from "../../api/hooks";
import { OfferCard } from "../../components/offers/OfferCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import { Inbox, Sparkles, AlertCircle } from "lucide-react";

export function OfferInboxPage() {
  const { facilityId, facilityName } = useAuth();
  const effectiveFacilityId = facilityId ?? "FAC_CBE_KMCH";

  const { data: offers, isLoading, isError, error, refetch } = useInboxQuery(effectiveFacilityId);
  const { data: facilities } = useFacilitiesQuery();

  // Map facility IDs to facility names
  const facilityNames = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (facilities) {
      for (const f of facilities) {
        map[f.facilityId] = f.name;
      }
    }
    return map;
  }, [facilities]);

  const openOffers = offers?.filter((o) => o.status === "OPEN") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Hospital Offer Inbox
            </h1>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {facilityName ?? "Kovai Medical Centre and Hospital"} • Live brokered offers from regional blood centres
          </p>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-3">
          {openOffers.length > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{openOffers.length} Active Offer{openOffers.length > 1 ? "s" : ""} Available</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Awaiting next sweep detection
            </span>
          )}
        </div>
      </div>

      {/* Main Inbox View */}
      {isLoading ? (
        <LoadingState message="Polling live rescue inbox..." />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? "Failed to fetch offers"}
          onRetry={() => refetch()}
        />
      ) : !offers || offers.length === 0 ? (
        /* Designed Empty State — First frame of the Friday demo video */
        <EmptyState
          icon={<Inbox className="w-10 h-10 text-slate-400" />}
          title="No offers in your inbox right now"
          message="PulseChain's rescue sweep monitors regional blood centres. When a platelet unit enters its 48-hour critical window, ranked offers appear here in real time."
        />
      ) : (
        <div className="space-y-4 max-w-4xl">
          {offers.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              facilityNames={facilityNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
