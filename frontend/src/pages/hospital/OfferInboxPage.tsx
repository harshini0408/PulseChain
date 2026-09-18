/**
 * /hospital/inbox — brokered offers addressed to this facility.
 *
 * Cards, not a table: each offer is a decision with a clock on it, and a table
 * row cannot carry a countdown ring, a reason and two actions legibly.
 *
 * Open offers come first, in the `rank` the backend assigned. Everything
 * settled collapses into Recent.
 */

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronDown, Inbox } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery } from "../../api/hooks";
import { OfferCard } from "../../components/offers/OfferCard";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { pluralise } from "../../lib/format";

export function OfferInboxPage() {
  // RequireAuth guarantees a facility here; there is no fallback ID.
  const { facilityId } = useAuth();
  const inbox = useInboxQuery(facilityId);
  const { nameOf } = useFacilityLookup();

  const [recentOpen, setRecentOpen] = useState(false);

  const { open, recent } = useMemo(() => {
    const offers: Offer[] = inbox.data ?? [];
    return {
      open: offers.filter((o) => o.status === "OPEN").sort((a, b) => a.rank - b.rank),
      recent: offers
        .filter((o) => o.status !== "OPEN")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  }, [inbox.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Hospital"
        title="Offer inbox"
        subtitle="Units the network is offering you, ranked by fit"
        actions={<ConnectionDot />}
      />

      {inbox.isLoading ? (
        <LoadingState variant="cards" rows={3} label="Loading offers" />
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
      ) : open.length === 0 && recent.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="No offers right now"
          message="Nearby units that match what you need will appear here. An offer arrives when a blood centre's unit crosses into its expiry window and this facility is inside the escalation ring."
        />
      ) : (
        <div className="space-y-8">
          {/* ── Needs your decision ─────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-text">Needs your decision</h2>
              <span className="text-xs text-text-muted">{pluralise(open.length, "offer")}</span>
            </div>

            {open.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                Nothing is waiting on you. Settled offers are below.
              </p>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {open.map((offer) => (
                    <OfferCard
                      key={offer.offerId}
                      offer={offer}
                      originName={nameOf(offer.originFacilityId)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* ── Recent ──────────────────────────────────────────────────── */}
          {recent.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setRecentOpen((v) => !v)}
                aria-expanded={recentOpen}
                className="mb-3 flex w-full items-center gap-2 text-sm font-bold text-text transition-colors hover:text-accent"
              >
                <ChevronDown
                  className={["h-4 w-4 transition-transform", recentOpen ? "rotate-180" : ""].join(" ")}
                />
                Recent
                <span className="text-xs font-normal text-text-muted">
                  {pluralise(recent.length, "offer")}
                </span>
              </button>

              {recentOpen && (
                <div className="space-y-4">
                  {recent.map((offer) => (
                    <OfferCard
                      key={offer.offerId}
                      offer={offer}
                      originName={nameOf(offer.originFacilityId)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
