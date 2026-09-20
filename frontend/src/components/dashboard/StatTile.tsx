/**
 * A headline number. The chart for a single figure is not a chart — it is the
 * figure, set large, with its label doing the explaining.
 *
 * UI/UX Enhancements:
 * - Animated count-up using ImpactCounter when `animate` is true
 * - Circular progress ring for percentage values (0–100)
 * - Entrance animation (fade + slide up) via Framer Motion
 * - Hover lift effect
 */

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ImpactCounter } from "../visualizations/ImpactCounter";

interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  tone?: "neutral" | "saved" | "lost" | "open";
  /** When true and value is a number, animate count-up. */
  animateValue?: number;
  /** When provided (0–100), shows a circular progress ring. */
  progressPct?: number | null;
  /** Animation delay for stagger */
  delay?: number;
}

const toneValue: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-text",
  saved: "text-status-received",
  lost: "text-status-lost",
  open: "text-status-open",
};

const toneIcon: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "bg-surface-overlay text-text-muted",
  saved: "bg-status-received-bg text-status-received",
  lost: "bg-status-lost-bg text-status-lost",
  open: "bg-status-open-bg text-status-open",
};

const toneRingColor: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "stroke-border",
  saved: "stroke-status-received",
  lost: "stroke-status-lost",
  open: "stroke-status-open",
};

/** SVG circular progress ring for rate percentages */
function ProgressRing({
  pct,
  tone,
}: {
  pct: number;
  tone: NonNullable<StatTileProps["tone"]>;
}) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="relative ml-auto flex h-12 w-12 flex-shrink-0 items-center justify-center">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        className="rotate-[-90deg]"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-border"
        />
        {/* Progress */}
        <motion.circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className={toneRingColor[tone]}
          animate={{ strokeDashoffset }}
          initial={{ strokeDashoffset: circumference }}
          transition={{ duration: 1.2, ease: [0.05, 0.7, 0.1, 1], delay: 0.3 }}
        />
      </svg>
      <span
        className={[
          "absolute text-xs font-bold tabular-nums",
          toneValue[tone],
        ].join(" ")}
        data-numeric="true"
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function StatTile({
  label,
  value,
  caption,
  icon,
  tone = "neutral",
  animateValue,
  progressPct,
  delay = 0,
}: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.05, 0.7, 0.1, 1], delay }}
      className="group rounded-xl border border-border bg-surface-raised p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_hsl(var(--brand-oxblood)/0.08)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {icon && (
            <span
              className={[
                "mb-3 flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                toneIcon[tone],
              ].join(" ")}
            >
              {icon}
            </span>
          )}
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">
            {label}
          </p>
          <p
            className={[
              "mt-1.5 font-display text-display-sm font-bold tabular-nums",
              toneValue[tone],
            ].join(" ")}
            data-numeric="true"
          >
            {animateValue !== undefined ? (
              <ImpactCounter value={animateValue} durationMs={1000} displayFont />
            ) : (
              value
            )}
          </p>
          {caption && <p className="mt-1 text-xs text-text-subtle">{caption}</p>}
        </div>

        {/* Circular ring for percentage values */}
        {progressPct !== null && progressPct !== undefined && (
          <ProgressRing pct={progressPct} tone={tone} />
        )}
      </div>
    </motion.div>
  );
}
