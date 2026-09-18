/**
 * A headline number. The chart for a single figure is not a chart — it is the
 * figure, set large, with its label doing the explaining.
 */

import { type ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  tone?: "neutral" | "saved" | "lost";
}

const toneValue: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "text-text",
  saved: "text-status-received",
  lost: "text-status-lost",
};

const toneIcon: Record<NonNullable<StatTileProps["tone"]>, string> = {
  neutral: "bg-surface-overlay text-text-muted",
  saved: "bg-status-received-bg text-status-received",
  lost: "bg-status-lost-bg text-status-lost",
};

export function StatTile({ label, value, caption, icon, tone = "neutral" }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-card">
      {icon && (
        <span
          className={["mb-3 flex h-8 w-8 items-center justify-center rounded-lg", toneIcon[tone]].join(" ")}
        >
          {icon}
        </span>
      )}
      <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">{label}</p>
      <p
        className={["mt-1.5 font-display text-display-sm font-bold tabular-nums", toneValue[tone]].join(" ")}
        data-numeric="true"
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-text-subtle">{caption}</p>}
    </div>
  );
}
