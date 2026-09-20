import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  tone?: "neutral" | "accent" | "positive";
  /** Renders as a button when supplied — used by the stock alert strip. */
  onClick?: () => void;
  active?: boolean;
  /** Pulsing urgency ring — for critical inventory alerts */
  urgent?: boolean;
  /** Stagger delay for entrance animation */
  delay?: number;
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
  urgent = false,
  delay = 0,
}: StatCardProps) {
  const body = (
    <>
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

  const base =
    "group rounded-xl border bg-surface-raised p-4 text-left shadow-card transition-all hover:-translate-y-0.5";

  // Urgent variant — crimson ring pulse
  const urgentClass = urgent
    ? "border-accent ring-2 ring-accent/40 shadow-[0_0_16px_hsl(var(--accent)/0.2)]"
    : "";

  if (!onClick) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1], delay }}
        className={[base, "border-border", urgentClass].join(" ")}
      >
        {urgent && (
          <span
            className="absolute inset-0 rounded-xl border-2 border-accent/30 pointer-events-none"
            style={{ animation: "rescue-edge 1.6s ease-in-out infinite" }}
            aria-hidden="true"
          />
        )}
        <div className="relative">{body}</div>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1], delay }}
      className={[
        base,
        "hover:border-border-strong",
        active ? "border-accent ring-1 ring-accent" : "border-border",
        urgentClass,
      ].join(" ")}
    >
      {body}
    </motion.button>
  );
}
