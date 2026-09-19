/**
 * /hospital/inbox — brokered active offers addressed to this facility.
 *
 * Clean, compact, minimal cards displaying only active, unexpired offers.
 */

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery } from "../../api/hooks";
import { OfferCard } from "../../components/offers/OfferCard";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { pluralise } from "../../lib/format";

export function OfferInboxPage() {
  const { facilityId } = useAuth();
  const inbox = useInboxQuery(facilityId);
  const { nameOf } = useFacilityLookup();

  // ONLY show active, unexpired offers that need a decision
  const activeOffers = useMemo(() => {
    const offers: Offer[] = inbox.data ?? [];
    const now = Date.now();
    return offers
      .filter((o) => o.status === "OPEN" && new Date(o.claimBy).getTime() > now)
      .sort((a, b) => a.rank - b.rank);
  }, [inbox.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Hospital"
        title="Offer inbox"
        subtitle="Active rescue offers addressed to this facility"
        actions={<ConnectionDot />}
      />

      {inbox.isLoading ? (
        <LoadingState variant="cards" rows={3} label="Checking for active offers…" />
      ) : inbox.isError ? (
        <ErrorState
          title="The inbox did not load"
          message={
            inbox.error instanceof Error
              ? inbox.error.message
              : "The inbox endpoint did not respond."
          }
          onRetry={() => void inbox.refetch()}
        />
      ) : activeOffers.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="No active offers right now"
          message="When a nearby blood centre's inventory approaches expiry and matches your clinical demand, active offers will appear here for you to claim within the response window."
        />
      ) : (
        <div className="space-y-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Needs your decision
            </h2>
            <span className="text-xs text-text-muted">
              {pluralise(activeOffers.length, "active offer")}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {activeOffers.map((offer) => (
                <OfferCard
                  key={offer.offerId}
                  offer={offer}
                  originName={nameOf(offer.originFacilityId)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
