/**
 * Why this offer reached this hospital.
 *
 * Four of the five inputs are 0–1 sub-scores and are drawn as weighted bars.
 * `distanceKm` is NOT one of them — it is a distance in kilometres, and drawing
 * it as a bar would imply "4.2 out of 1". It gets its own row showing the real
 * distance, the sub-score the scorer derives from it, and the same weight.
 *
 * Every weight comes from shared/src/config.ts. None are written here.
 */

import { distanceSubScore, getConfig, type MatchBreakdown as Breakdown } from "@pulsechain/shared";
import { formatDistanceKm, formatHoursMinutes } from "../../lib/format";

interface MatchBreakdownProps {
  breakdown: Breakdown;
  score: number;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function Bar({ value, weight }: { value: number; weight: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className="h-full rounded-full bg-accent"
          // The bar shows the sub-score; the weight is stated in the label beside it.
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
      <span className="w-8 flex-shrink-0 text-right text-2xs tabular-nums text-text-muted" data-numeric="true">
        {pct(value)}
      </span>
      <span className="w-10 flex-shrink-0 text-right text-2xs tabular-nums text-text-subtle" data-numeric="true">
        ×{pct(weight)}
      </span>
    </div>
  );
}

export function MatchBreakdown({ breakdown, score }: MatchBreakdownProps) {
  const { scoreWeights } = getConfig();

  const rows: Array<{ label: string; value: number; weight: number }> = [
    { label: "Compatibility", value: breakdown.compatibility, weight: scoreWeights.compatibility },
    { label: "Open requisition", value: breakdown.openRequisition, weight: scoreWeights.openRequisition },
    { label: "Standing demand", value: breakdown.standingDemand, weight: scoreWeights.standingDemand },
    { label: "Urgency", value: breakdown.urgency, weight: scoreWeights.urgency },
  ];

  const derivedDistanceScore = distanceSubScore(breakdown.distanceKm);

  return (
    <div className="rounded-xl bg-surface-sunken p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
          Match breakdown
        </p>
        <p className="text-2xs tabular-nums text-text-muted" data-numeric="true">
          total <span className="font-bold text-text">{score.toFixed(2)}</span>
        </p>
      </div>

      <dl className="space-y-2.5">
        {rows.map(({ label, value, weight }) => (
          <div key={label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd>
              <Bar value={value} weight={weight} />
            </dd>
          </div>
        ))}

        {/* Distance is a measurement, not a sub-score. It reads as one. */}
        <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 border-t border-border pt-2.5">
          <dt className="text-xs text-text-muted">Distance</dt>
          <dd className="flex items-baseline gap-2">
            <span className="text-sm font-bold tabular-nums text-text" data-numeric="true">
              {formatDistanceKm(breakdown.distanceKm)}
            </span>
            <span className="text-2xs text-text-subtle">
              scores {pct(derivedDistanceScore)} · ×{pct(scoreWeights.distance)}
            </span>
          </dd>
        </div>

        <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
          <dt className="text-xs text-text-muted">Time left on unit</dt>
          <dd className="text-sm font-bold tabular-nums text-text" data-numeric="true">
            {formatHoursMinutes(breakdown.hoursRemaining)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
