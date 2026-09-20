/**
 * /hospital/inbox — brokered active offers addressed to this facility.
 *
 * UI/UX Enhancements:
 * - Urgency banner when any offer is < 30 min from expiry
 * - Staggered card entrance animation via Framer Motion variants
 * - Animated offer count badge
 * - Pulsing accent ring on the most urgent offer
 * - Mobile-friendly layout with clear visual hierarchy
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Inbox } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery } from "../../api/hooks";
import { OfferCard } from "../../components/offers/OfferCard";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { pluralise } from "../../lib/format";

/** Stagger container — each child arrives sequentially */
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.05, 0.7, 0.1, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.97,
    filter: "blur(3px)",
    transition: { duration: 0.3 },
  },
};

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

  // Check if any offers are critically urgent (< 30 min to claim window close)
  const hasCriticalOffer = useMemo(() => {
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    return activeOffers.some(
      (o) => new Date(o.claimBy).getTime() - now < thirtyMin,
    );
  }, [activeOffers]);

  // The most urgent offer (rank 1) gets a special pulsing ring
  const mostUrgentOfferId = activeOffers[0]?.offerId;

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
          {/* ── Urgency Banner ────────────────────────────────────────── */}
          <AnimatePresence>
            {hasCriticalOffer && (
              <motion.div
                key="urgency-banner"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3">
                  <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
                    <AlertTriangle className="relative h-4 w-4 text-accent" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-accent">
                      Claim window closing in &lt;30 min
                    </p>
                    <p className="text-2xs text-text-muted">
                      At least one offer requires immediate attention. Unclaimed offers are
                      escalated to the next ring.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Header row ────────────────────────────────────────────── */}
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Needs your decision
            </h2>
            <motion.span
              key={activeOffers.length}
              initial={{ scale: 1.3, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-semibold tabular-nums text-accent"
              data-numeric="true"
            >
              {pluralise(activeOffers.length, "active offer")}
            </motion.span>
          </div>

          {/* ── Offer list with stagger ───────────────────────────────── */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {activeOffers.map((offer) => (
                <motion.div
                  key={offer.offerId}
                  variants={itemVariants}
                  layout
                  exit="exit"
                  className={[
                    "rounded-xl transition-shadow",
                    offer.offerId === mostUrgentOfferId && hasCriticalOffer
                      ? "ring-2 ring-accent/40 shadow-[0_0_16px_hsl(var(--accent)/0.15)]"
                      : "",
                  ].join(" ")}
                >
                  <OfferCard
                    offer={offer}
                    originName={nameOf(offer.originFacilityId)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}
