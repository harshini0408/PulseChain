/**
 * One brokered offer.
 *
 * Two clocks live on this card and they are not the same clock:
 *   - the ring counts down `claimBy`, this hospital's window to respond;
 *   - the secondary line counts down the unit's own expiry.
 * Both are shown because a long claim window on a nearly-dead unit is a
 * different decision from a short window on a fresh one.
 *
 * On a lost claim race the card flips to a failure state carrying the
 * backend's exact message — "Already claimed by <facility>" — holds it for
 * four seconds, and only then drops out. It is never removed silently.
 */

import { forwardRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, MapPin } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { getConfig } from "@pulsechain/shared";
import { useClaimMutation, useDeclineMutation } from "../../api/hooks";
import { useCountdown } from "../../lib/useCountdown";
import { usePrefersReducedMotion } from "../../lib/motion";
import { ringToken } from "../../lib/status";
import { formatDistanceKm } from "../../lib/format";
import { BloodGroupToken } from "../ui/BloodGroupToken";
import { StatusPill } from "../ui/StatusPill";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import { ClaimButton } from "./ClaimButton";
import { CountdownRing } from "./CountdownRing";
import { MatchBreakdown } from "./MatchBreakdown";

interface OfferCardProps {
  offer: Offer;
  originName: string;
}

/** How long a failed claim holds on screen before the card drops out. */
const FAILURE_HOLD_MS = 4000;

const DECLINE_REASONS = [
  { value: "NO_MATCHING_PATIENT", label: "No matching patient" },
  { value: "STOCK_SUFFICIENT", label: "Stock sufficient" },
  { value: "CANNOT_COLLECT_IN_TIME", label: "Cannot collect in time" },
] as const;

export const OfferCard = forwardRef<HTMLElement, OfferCardProps>(function OfferCard(
  { offer, originName },
  ref,
) {
  const claim = useClaimMutation();
  const decline = useDeclineMutation();
  const { push } = useToast();
  const reducedMotion = usePrefersReducedMotion();

  const [expanded, setExpanded] = useState(false);
  const [decliningOpen, setDecliningOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // The Offer record carries no expiresAt, only `breakdown.hoursRemaining` as
  // measured when the offer was scored. Reconstructing the unit's expiry from
  // createdAt plus that figure is exact at creation and drifts by nothing
  // afterwards, since both ends are fixed timestamps.
  const unitExpiresAt = new Date(
    new Date(offer.createdAt).getTime() + offer.breakdown.hoursRemaining * 3600 * 1000,
  ).toISOString();
  const unitCountdown = useCountdown(unitExpiresAt);

  const claimWindow = useCountdown(offer.claimBy);
  const ring = ringToken(offer.ring);
  const isOpen = offer.status === "OPEN";
  const windowClosed = claimWindow.isExpired;

  // Hold the failure on screen, then drop the card out.
  useEffect(() => {
    if (!failure) return;
    const timer = window.setTimeout(() => setDismissed(true), FAILURE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [failure]);

  if (dismissed) return null;

  const handleClaim = async () => {
    setFailure(null);
    try {
      const res = await claim.mutateAsync(offer.offerId);
      setClaimed(true);
      push({
        tone: "success",
        title: "Unit claimed",
        message: res.message || `${offer.unitId} is yours. Track it under Transfers.`,
      });
    } catch (err) {
      // Render the backend's message verbatim. A 409 naming the winning
      // facility is the most useful sentence this screen can show.
      const message =
        err instanceof Error ? err.message : "The claim was rejected and gave no reason.";
      setFailure(message);
      push({ tone: "error", title: "Claim rejected", message });
    }
  };

  const handleDecline = async (reason: string) => {
    try {
      await decline.mutateAsync({ offerId: offer.offerId, reason });
      setDecliningOpen(false);
      setDismissed(true);
      push({ tone: "info", title: "Offer declined", message: `${offer.unitId} released.` });
    } catch (err) {
      push({
        tone: "error",
        title: "Could not decline",
        message: err instanceof Error ? err.message : "The decline was rejected.",
      });
    }
  };

  // Motion place two of three: an offer arriving in the inbox.
  const entry = reducedMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.28, ease: "easeOut" as const },
      };

  return (
    <motion.article
      ref={ref}
      layout={!reducedMotion}
      {...entry}
      className={[
        "overflow-hidden rounded-xl border bg-surface-raised shadow-card",
        failure ? "border-status-lost/40" : claimed ? "border-status-received/40" : "border-border",
      ].join(" ")}
    >
      {/* ── Failure banner — the 409 shot ───────────────────────────────── */}
      {failure && (
        <div className="flex items-start gap-2.5 bg-status-lost-bg px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-lost" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-text">Claim rejected</p>
            <p className="mt-0.5 break-words text-sm text-text">{failure}</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <BloodGroupToken
            bloodGroup={offer.bloodGroup ?? "—"}
            component={offer.component}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={["inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold", ring.pill].join(" ")}
              >
                <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
                {ring.label}
              </span>
              {!isOpen && <StatusPill kind="offer" value={offer.status} size="sm" />}
              {offer.volumeMl !== undefined && (
                <span className="text-2xs text-text-subtle">{offer.volumeMl} ml</span>
              )}
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-text">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
              <span className="truncate">{originName}</span>
              <span className="flex-shrink-0 font-normal text-text-muted">
                · {formatDistanceKm(offer.breakdown.distanceKm)}
              </span>
            </p>

            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{offer.reason}</p>

            <p className="mt-2 text-2xs text-text-subtle">
              Unit expires in{" "}
              <span className="font-semibold tabular-nums text-text-muted" data-numeric="true">
                {unitCountdown.label}
              </span>{" "}
              · unit <span className="font-mono">{offer.unitId}</span>
            </p>
          </div>

          <CountdownRing createdAt={offer.createdAt} claimBy={offer.claimBy} />
        </div>

        {/* ── Breakdown ───────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-2xs font-semibold text-text-muted transition-colors hover:text-accent"
        >
          <ChevronDown
            className={["h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : ""].join(" ")}
          />
          {expanded ? "Hide" : "Why this offer"}
        </button>

        {expanded && (
          <div className="mt-3">
            <MatchBreakdown breakdown={offer.breakdown} score={offer.score} />
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {isOpen && !failure && (
          <div className="mt-4 border-t border-border pt-4">
            {decliningOpen ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-text">Why are you declining?</p>
                <div className="flex flex-wrap gap-2">
                  {DECLINE_REASONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={decline.isPending}
                      onClick={() => void handleDecline(value)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDecliningOpen(false)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : claimed ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ClaimButton claimed onClick={() => {}} />
                <Link
                  to="/hospital/transfers"
                  className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Track it under Transfers →
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ClaimButton
                  onClick={() => void handleClaim()}
                  loading={claim.isPending}
                  disabled={windowClosed}
                />
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setDecliningOpen(true)}
                  disabled={claim.isPending || windowClosed}
                >
                  Decline
                </Button>
                {windowClosed && (
                  <span className="text-xs text-text-subtle">Claim window closed</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
});
