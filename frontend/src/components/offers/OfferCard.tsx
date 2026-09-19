import { forwardRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, MapPin, Building } from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { useClaimMutation, useDeclineMutation } from "../../api/hooks";
import { useCountdown } from "../../lib/useCountdown";
import { usePrefersReducedMotion } from "../../lib/motion";
import { ringToken, componentClock } from "../../lib/status";
import { formatDistanceKm } from "../../lib/format";
import { BloodGroupToken } from "../ui/BloodGroupToken";
import { StatusPill } from "../ui/StatusPill";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import { ClaimButton } from "./ClaimButton";
import { CountdownRing } from "./CountdownRing";
import { MatchBreakdown } from "./MatchBreakdown";
import { ExpiryClock } from "../visualizations/ExpiryClock";
import { FlowLine } from "../motion/FlowLine";

interface OfferCardProps {
  offer: Offer;
  originName: string;
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

  // Reconstructing unit's expiry from createdAt + breakdown.hoursRemaining
  const unitExpiresAt = new Date(
    new Date(offer.createdAt).getTime() + offer.breakdown.hoursRemaining * 3600 * 1000,
  ).toISOString();
  const unitCountdown = useCountdown(unitExpiresAt);

  const claimWindow = useCountdown(offer.claimBy);
  const ring = ringToken(offer.ring);
  const isOpen = offer.status === "OPEN";
  const windowClosed = claimWindow.isExpired;
  const clock = componentClock(offer.component ?? "PLATELETS");

  // Hold the failure on screen, then drop out
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
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.3, ease: [0.2, 0, 0, 1] as const },
      };

  return (
    <motion.article
      ref={ref}
      layout={!reducedMotion}
      {...entry}
      className={[
        "overflow-hidden rounded-2xl border glass-surface shadow-sm transition-all relative",
        failure
          ? "border-status-lost/50 bg-status-lost-bg/30"
          : claimed
          ? "border-status-received/50 bg-status-received-bg/20"
          : "border-border/80 hover:border-border-strong",
      ].join(" ")}
    >
      {/* ── Failure banner ───────────────────────────────── */}
      {failure && (
        <div className="flex items-start gap-2.5 bg-status-lost-bg px-4 py-3 border-b border-status-lost/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-lost" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-text">Claim rejected</p>
            <p className="mt-0.5 break-words text-sm text-text">{failure}</p>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          {/* Main Info */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <BloodGroupToken
              bloodGroup={offer.bloodGroup ?? "—"}
              component={offer.component}
              size="md"
            />

            <div className="min-w-0 flex-1">
              {/* Ring badge and metadata */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-semibold",
                    ring.pill,
                  ].join(" ")}
                >
                  <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
                  {ring.label}
                </span>

                {!isOpen && <StatusPill kind="offer" value={offer.status} size="sm" />}

                {offer.volumeMl !== undefined && (
                  <span className="text-2xs text-text-subtle font-mono">{offer.volumeMl} ml</span>
                )}
                <span className="text-2xs font-mono text-text-subtle">· {offer.unitId}</span>
              </div>

              {/* Dominant Blood Component Display Title */}
              <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-text tracking-tight">
                {offer.bloodGroup} {clock.label}
              </h3>

              {/* Source facility and proximity */}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <Building className="h-3.5 w-3.5 flex-shrink-0 text-text-subtle" />
                <span className="truncate">From {originName}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-sunken px-1.5 py-0.5 text-2xs text-text">
                  <MapPin className="h-2.5 w-2.5 text-accent" />
                  {formatDistanceKm(offer.breakdown.distanceKm)}
                </span>
              </p>

              {/* Rationale */}
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{offer.reason}</p>

              {/* Trio: Distance + Expiry Clock + Viability */}
              <div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl bg-surface/70 p-3 border border-border/60">
                <div className="flex items-center gap-2.5">
                  <ExpiryClock compact expiresAt={unitExpiresAt} size={30} />
                  <div className="flex flex-col">
                    <span className="text-3xs uppercase font-semibold text-text-subtle">
                      Unit Shelf-Life
                    </span>
                    <span className="text-xs font-bold text-text tabular-nums" data-numeric="true">
                      {unitCountdown.label} remaining
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-border/60 hidden sm:block" />

                <div className="flex flex-col">
                  <span className="text-3xs uppercase font-semibold text-text-subtle">
                    Corridor Transit
                  </span>
                  <span className="text-xs font-bold text-text">
                    ~{Math.round(offer.breakdown.distanceKm * 2.2)} mins estimated
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Offer Decision Clock Ring */}
          <div className="flex-shrink-0 self-center sm:self-start">
            <CountdownRing createdAt={offer.createdAt} claimBy={offer.claimBy} />
          </div>
        </div>

        {/* ── Breakdown ───────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-4 inline-flex items-center gap-1.5 text-2xs font-semibold text-text-muted transition-colors hover:text-accent"
        >
          <ChevronDown
            className={["h-3.5 w-3.5 transition-transform", expanded ? "rotate-180" : ""].join(" ")}
          />
          {expanded ? "Hide match criteria" : "Why this offer was matched to you"}
        </button>

        {expanded && (
          <div className="mt-3">
            <MatchBreakdown breakdown={offer.breakdown} score={offer.score} />
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {isOpen && !failure && (
          <div className="mt-5 border-t border-border/70 pt-4">
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
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
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
                  Track rescue corridor under Transfers →
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
                  <span className="text-xs text-text-subtle font-medium">Claim window expired</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flow Line Connection at bottom of card */}
        <div className="mt-4 pt-2 border-t border-border/40">
          <FlowLine
            state={claimed ? "completed" : isOpen ? "active" : "inactive"}
            originLabel={originName}
            targetLabel="Your Centre"
            showPulse={isOpen}
          />
        </div>
      </div>
    </motion.article>
  );
});
