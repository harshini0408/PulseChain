/**
 * Empty states are a Tier A brand surface: blush field, serif line, room to
 * breathe. Copy says what would appear here and what would put it here —
 * no apologies, no exclamation marks.
 */

import { type ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, message, icon, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={[
        "brand-field flex flex-col items-center justify-center rounded-3xl border border-border px-6 py-14 text-center sm:py-20",
        className,
      ].join(" ")}
    >
      {icon && (
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-accent shadow-card">
          {icon}
        </span>
      )}
      <h3 className="font-display text-display-sm font-semibold text-text">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
