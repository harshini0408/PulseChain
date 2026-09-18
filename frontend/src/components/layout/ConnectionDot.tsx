/**
 * Live connection indicator, driven by GET /health on a 15s heartbeat.
 *
 *   green   — reachable, responded ok, and quickly
 *   amber   — reachable but degraded: slow, or ok:false
 *   crimson — unreachable
 *
 * The distinction matters during a demo: a slow API and a dead one look
 * identical from a stalled table, and only one of them is worth stopping for.
 */

import { useHealthQuery } from "../../api/hooks";

/** Above this round-trip the API is up but not keeping pace with a 3.5s poll. */
const DEGRADED_ABOVE_MS = 1500;

type Condition = "connected" | "degraded" | "unreachable" | "checking";

const CONDITION: Record<Condition, { dot: string; label: string; title: string }> = {
  connected: { dot: "bg-status-received", label: "Live", title: "Connected" },
  degraded: { dot: "bg-status-in-transit", label: "Slow", title: "Reachable but degraded" },
  unreachable: { dot: "bg-status-lost", label: "Offline", title: "API unreachable" },
  checking: { dot: "bg-text-subtle", label: "…", title: "Checking connection" },
};

export function ConnectionDot({ showLabel = true }: { showLabel?: boolean }) {
  const { data, isError, isLoading } = useHealthQuery();

  const condition: Condition = isError
    ? "unreachable"
    : isLoading || !data
      ? "checking"
      : !data.ok || data.latencyMs > DEGRADED_ABOVE_MS
        ? "degraded"
        : "connected";

  const { dot, label, title } = CONDITION[condition];
  const detail = data ? `${title} · ${data.latencyMs}ms` : title;

  return (
    <span className="inline-flex items-center gap-1.5" title={detail}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {condition === "connected" && (
          <span className={["absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dot].join(" ")} />
        )}
        <span className={["relative inline-flex h-2 w-2 rounded-full", dot].join(" ")} />
      </span>
      {showLabel && <span className="text-2xs font-medium text-text-muted">{label}</span>}
      <span className="sr-only">{detail}</span>
    </span>
  );
}
