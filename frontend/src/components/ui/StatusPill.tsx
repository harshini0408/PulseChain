// Color-coded status pill using CSS variable tokens.
// All colours come from the design token system — no hardcoded hex here.

type Status =
  | "OPEN"
  | "CLAIMED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "LOST"
  | "EXPIRED"
  | "RUNNING"
  | "RESOLVED"
  | "EXHAUSTED"
  | "AVAILABLE"
  | "RESCUE_PENDING";

interface StatusPillProps {
  status: Status | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  OPEN: { label: "Open", classes: "text-status-open bg-[hsl(var(--status-open-bg))]" },
  CLAIMED: { label: "Claimed", classes: "text-status-claimed bg-[hsl(var(--status-claimed-bg))]" },
  IN_TRANSIT: { label: "In Transit", classes: "text-status-in-transit bg-[hsl(var(--status-in-transit-bg))]" },
  RECEIVED: { label: "Received", classes: "text-status-received bg-[hsl(var(--status-received-bg))]" },
  LOST: { label: "Lost", classes: "text-status-lost bg-[hsl(var(--status-lost-bg))]" },
  EXPIRED: { label: "Expired", classes: "text-status-expired bg-[hsl(var(--status-expired-bg))]" },
  AVAILABLE: { label: "Available", classes: "text-status-received bg-[hsl(var(--status-received-bg))]" },
  RESCUE_PENDING: { label: "Rescue Pending", classes: "text-platelet bg-platelet-bg" },
  RUNNING: { label: "Running", classes: "text-status-open bg-[hsl(var(--status-open-bg))]" },
  RESOLVED: { label: "Resolved", classes: "text-status-received bg-[hsl(var(--status-received-bg))]" },
  EXHAUSTED: { label: "Exhausted", classes: "text-status-lost bg-[hsl(var(--status-lost-bg))]" },
};

export function StatusPill({ status, className = "" }: StatusPillProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: "text-text-muted bg-surface-overlay",
  };

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        config.classes,
        className,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}
