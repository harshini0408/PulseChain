import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  tone?: "neutral" | "accent" | "positive";
  /** Renders as a button when supplied — used by the stock alert strip. */
  onClick?: () => void;
  active?: boolean;
}

const toneValue: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-text",
  accent: "text-accent",
  positive: "text-status-received",
};

const toneIcon: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "bg-surface-overlay text-text-muted",
  accent: "bg-accent-soft text-accent",
  positive: "bg-status-received-bg text-status-received",
};

export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = "neutral",
  onClick,
  active = false,
}: StatCardProps) {
  const body = (
    <>
      {icon && (
        <span
          className={[
            "mb-3 flex h-8 w-8 items-center justify-center rounded-lg",
            toneIcon[tone],
          ].join(" ")}
        >
          {icon}
        </span>
      )}
      <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted">{label}</p>
      <p
        className={["mt-1.5 text-2xl font-bold tabular-nums", toneValue[tone]].join(" ")}
        data-numeric="true"
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-text-subtle">{caption}</p>}
    </>
  );

  const base = "rounded-xl border bg-surface-raised p-4 text-left shadow-card transition-colors";

  if (!onClick) {
    return <div className={[base, "border-border"].join(" ")}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        base,
        "hover:border-border-strong",
        active ? "border-accent ring-1 ring-accent" : "border-border",
      ].join(" ")}
    >
      {body}
    </button>
  );
}
