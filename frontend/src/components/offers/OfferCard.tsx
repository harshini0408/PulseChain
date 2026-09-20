import { forwardRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, Clock, MapPin } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
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
import { soundManager } from "../../lib/soundManager";

interface OfferCardProps {
  offer: Offer;
  originName: string;
  isPrimary?: boolean;
}

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

  // Expiry of unit
  const unitExpiresAt = new Date(
    new Date(offer.createdAt).getTime() + offer.breakdown.hoursRemaining * 3600 * 1000,
  ).toISOString();
  const unitCountdown = useCountdown(unitExpiresAt);

  const claimWindow = useCountdown(offer.claimBy);
  const ring = ringToken(offer.ring);
  const isOpen = offer.status === "OPEN";
  const windowClosed = claimWindow.isExpired;

  // Hold the failure on screen, then drop the card out
  useEffect(() => {
    if (!failure) return;
    const timer = window.setTimeout(() => setDismissed(true), FAILURE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [failure]);

  // Do not show expired offers
  if (dismissed) return null;
  if (windowClosed && !claimed) return null;

  const handleClaim = async () => {
    setFailure(null);
    try {
      const res = await claim.mutateAsync(offer.offerId);
      setClaimed(true);
      soundManager.play("claim");
      push({
        tone: "success",
        title: "Unit claimed",
        message: res.message || `${offer.unitId} is yours. Track it under Transfers.`,
      });
    } catch (err) {
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

  const entry = reducedMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      };

  return (
    <motion.article
      ref={ref}
      layout={!reducedMotion}
      {...entry}
      className={[
        "overflow-hidden rounded-2xl border bg-surface-raised shadow-card transition-all hover:shadow-card-hover hover:border-accent/40",
        failure
          ? "border-status-lost/40"
          : claimed
          ? "border-status-received/40"
          : "border-border/80",
      ].join(" ")}
    >
      {/* Failure banner */}
      {failure && (
        <div className="flex items-start gap-2.5 bg-status-lost-bg px-4 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-lost" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-text">Claim rejected</p>
            <p className="mt-0.5 break-words text-xs text-text">{failure}</p>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Main Left: Badge + Details */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <BloodGroupToken
              bloodGroup={offer.bloodGroup ?? "—"}
              component={offer.component}
              size="md"
            />

            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Row 1: Ring Pill, Volume, Unit ID */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider",
                    ring.pill,
                  ].join(" ")}
                >
                  <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
                  {ring.label}
                </span>

                {!isOpen && <StatusPill kind="offer" value={offer.status} size="sm" />}

                {offer.volumeMl !== undefined && (
                  <span className="rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-2xs font-semibold text-text-muted border border-border/60">
                    {offer.volumeMl} ml
                  </span>
                )}

                <span className="font-mono text-2xs text-text-subtle">
                  · {offer.unitId}
                </span>
              </div>

              {/* Row 2: Facility Name + Distance */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
                <span className="truncate">{originName}</span>
                <span className="flex-shrink-0 font-normal text-text-muted">
                  ({formatDistanceKm(offer.breakdown.distanceKm)})
                </span>
              </div>

              {/* Row 3: Rationale sentence */}
              <p className="text-xs leading-relaxed text-text-muted">
                {offer.reason}
              </p>

              {/* Row 4: Shelf Life */}
              <div className="flex items-center gap-1 text-2xs text-text-subtle pt-0.5">
                <Clock className="h-3 w-3 text-text-muted" />
                <span>Unit shelf-life:</span>
                <strong className="font-semibold text-text tabular-nums" data-numeric="true">
                  {unitCountdown.label} remaining
                </strong>
              </div>
            </div>
          </div>

          {/* Right Action & Countdown Zone */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 lg:border-t-0 lg:pt-0 lg:pl-4 flex-shrink-0 justify-between lg:justify-end">
            {/* Criteria Toggle Button */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-sunken px-2.5 py-1.5 text-2xs font-semibold text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              <ChevronDown
                className={["h-3 w-3 transition-transform", expanded ? "rotate-180" : ""].join(" ")}
              />
              {expanded ? "Hide criteria" : "Why matched"}
            </button>

            {/* Countdown Ring */}
            <CountdownRing createdAt={offer.createdAt} claimBy={offer.claimBy} size={48} />

            {/* Action Buttons */}
            {isOpen && !failure && (
              <div className="flex items-center gap-2">
                {decliningOpen ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-3xs font-semibold text-text-muted uppercase tracking-wider">Decline reason?</p>
                    <div className="flex flex-wrap justify-end gap-1">
                      {DECLINE_REASONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          disabled={decline.isPending}
                          onClick={() => void handleDecline(value)}
                          className="rounded-full border border-border bg-surface px-2.5 py-1 text-3xs font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDecliningOpen(false)}
                        className="rounded-full px-2 py-1 text-3xs font-medium text-text-muted hover:text-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : claimed ? (
                  <div className="flex items-center gap-2">
                    <ClaimButton claimed onClick={() => {}} />
                    <Link
                      to="/hospital/transfers"
                      className="text-2xs font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      Transfers →
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
                      size="sm"
                      onClick={() => setDecliningOpen(true)}
                      disabled={claim.isPending || windowClosed}
                      className="px-3 text-xs text-text-muted hover:text-accent"
                    >
                      Decline
                    </Button>
                    {windowClosed && (
                      <span className="text-3xs font-semibold text-text-subtle">Closed</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Rationale */}
        {expanded && (
          <div className="mt-3.5 border-t border-border/60 pt-3">
            <MatchBreakdown breakdown={offer.breakdown} score={offer.score} />
          </div>
        )}
      </div>
    </motion.article>
  );
});
