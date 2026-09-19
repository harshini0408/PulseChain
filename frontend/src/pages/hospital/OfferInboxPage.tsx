/**
 * /hospital/inbox — brokered offers addressed to this facility.
 *
 * New composition:
 *  1. INCOMING SCENE HEADER — "N BLOOD UNITS ARE WAITING FOR YOU" with animated count
 *  2. PRIMARY OFFER — dominant, full-width treatment
 *  3. SECONDARY OFFERS — compact horizontal queue
 *  4. RECENT — collapsible (unchanged)
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery } from "../../api/hooks";
import { OfferCard } from "../../components/offers/OfferCard";
import { ErrorState, LoadingState } from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { NetworkPulse } from "../../components/motion/NetworkPulse";
import { PulseLine } from "../../components/motion/PulseLine";
import { pluralise } from "../../lib/format";

export function OfferInboxPage() {
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

  const primaryOffer = open[0] ?? null;
  const queuedOffers = open.slice(1);

  return (
    <div>
      {/* ── 1. INCOMING SCENE HEADER ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xs font-bold uppercase tracking-widest text-text-subtle">
            Hospital Inbox
          </span>
          <span className="text-text-subtle text-xs">·</span>
          <ConnectionDot />
        </div>

        {inbox.isLoading ? null : (
          <>
            <h1 className="editorial-headline text-text">
              {open.length === 0 ? (
                "No offers\nright now."
              ) : open.length === 1 ? (
                <>
                  <motion.span
                    key="count-1"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-accent"
                  >
                    1
                  </motion.span>{" "}
                  blood unit
                  <br />
                  is waiting for you.
                </>
              ) : (
                <>
                  <motion.span
                    key={`count-${open.length}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-accent"
                  >
                    {open.length}
                  </motion.span>{" "}
                  blood units
                  <br />
                  are waiting for you.
                </>
              )}
            </h1>

            {open.length > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-sm text-text-muted max-w-lg"
              >
                Ranked by clinical need and proximity. Each offer has a claim window — act before it
                closes.
              </motion.p>
            )}

            <div className="mt-5 w-64 opacity-40">
              <PulseLine height={16} color="hsl(var(--accent))" />
            </div>
          </>
        )}
      </motion.section>

      {inbox.isLoading ? (
        <LoadingState variant="cards" rows={2} label="Checking what the network is offering you…" />
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
        /* ── Empty state ─────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-border/70 bg-surface-raised p-12 text-center flex flex-col items-center"
        >
          <NetworkPulse size={56} className="mb-5 opacity-60" />
          <h3 className="font-display text-2xl font-bold text-text">
            The network is quiet right now
          </h3>
          <p className="mt-2 text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Nearby units matching your demand appear here the moment a blood centre's inventory
            enters an alert window.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* ── 2. PRIMARY OFFER ────────────────────────────────────────────── */}
          {primaryOffer && (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold text-text">Needs your decision</h2>
                <span className="text-xs text-text-muted">{pluralise(open.length, "offer")}</span>
              </div>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={primaryOffer.offerId}
                  className="animate-offer-arrive"
                  layout
                >
                  <OfferCard
                    offer={primaryOffer}
                    originName={nameOf(primaryOffer.originFacilityId)}
                    isPrimary
                  />
                </motion.div>
              </AnimatePresence>
            </section>
          )}

          {/* ── 3. QUEUED OFFERS ────────────────────────────────────────────── */}
          {queuedOffers.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
                Also available
              </h2>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {queuedOffers.map((offer, i) => (
                    <motion.div
                      key={offer.offerId}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.08, duration: 0.35 }}
                      layout
                    >
                      <OfferCard
                        offer={offer}
                        originName={nameOf(offer.originFacilityId)}
                        isPrimary={false}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* ── 4. RECENT ───────────────────────────────────────────────────── */}
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
                <div className="space-y-3">
                  {recent.map((offer) => (
                    <OfferCard
                      key={offer.offerId}
                      offer={offer}
                      originName={nameOf(offer.originFacilityId)}
                      isPrimary={false}
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
