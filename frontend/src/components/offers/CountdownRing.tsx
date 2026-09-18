/**
 * The claim-window ring. This counts down `claimBy` — the window this hospital
 * has to respond — which is a different clock from the unit's own expiry. Both
 * appear on an offer card, and conflating them would be the single most
 * dangerous thing this interface could do.
 */

import { useCountdown } from "../../lib/useCountdown";
import { remainingFraction } from "../../lib/countdown";
import { usePrefersReducedMotion } from "../../lib/motion";

interface CountdownRingProps {
  /** When the offer was created — the start of the window. */
  createdAt: string;
  /** When the window closes. */
  claimBy: string;
  size?: number;
}

/** Below this fraction remaining the ring turns crimson. Presentation only. */
const URGENT_BELOW = 0.34;

export function CountdownRing({ createdAt, claimBy, size = 56 }: CountdownRingProps) {
  const countdown = useCountdown(claimBy);
  const reducedMotion = usePrefersReducedMotion();

  const fraction = remainingFraction(createdAt, claimBy);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const urgent = fraction <= URGENT_BELOW || countdown.isExpired;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      title={countdown.isExpired ? "Claim window closed" : `${countdown.label} left to claim`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={urgent ? "stroke-accent" : "stroke-status-open"}
          style={reducedMotion ? undefined : { transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={[
            "text-[11px] font-bold leading-none tabular-nums",
            countdown.isExpired ? "text-text-subtle" : urgent ? "text-accent" : "text-text",
          ].join(" ")}
          data-numeric="true"
        >
          {countdown.isExpired ? "—" : countdown.clock}
        </span>
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-text-subtle">
          {countdown.isExpired ? "closed" : "to claim"}
        </span>
      </span>
    </div>
  );
}
