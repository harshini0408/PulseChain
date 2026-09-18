/**
 * A live expiry countdown, recomputed in the browser every second from
 * `expiresAt`. It never reads a server-supplied seconds field, which would sit
 * frozen between 3.5s polls and make the clock look stopped on camera.
 *
 * Reads "11h 42m" above an hour and "47m 03s" below it.
 */

import { AlertTriangle } from "lucide-react";
import type { Component } from "@pulsechain/shared";
import { useCountdown } from "../../lib/useCountdown";
import { CRITICAL_DISPLAY_HOURS, expiryTone } from "../../lib/status";

interface ExpiryCountdownProps {
  expiresAt: string;
  component: Component;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
} as const;

export function ExpiryCountdown({
  expiresAt,
  component,
  size = "md",
  className = "",
}: ExpiryCountdownProps) {
  const countdown = useCountdown(expiresAt);
  // Drive the colour from the live remaining time, not a stale server field.
  const tone = expiryTone(component, countdown.totalSeconds / 3600);

  /**
   * Colour alone cannot carry the critical step for platelets: their component
   * clock colour IS the crimson, so a platelet six hours out and one thirty
   * hours out would read identically. The critical state therefore also gets
   * weight and a mark, which works for every component and for anyone who
   * cannot separate the two reds.
   */
  const critical = tone.level === "critical";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 tabular-nums",
        critical ? "font-bold" : "font-semibold",
        sizeClasses[size],
        countdown.isExpired ? "text-status-lost" : tone.text,
        className,
      ].join(" ")}
      data-numeric="true"
      title={
        countdown.isExpired
          ? "This unit has passed its expiry"
          : critical
            ? `Under ${CRITICAL_DISPLAY_HOURS} hours remaining — expires ${new Date(expiresAt).toLocaleString("en-IN")}`
            : `Expires ${new Date(expiresAt).toLocaleString("en-IN")}`
      }
    >
      {critical && <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
      {countdown.label}
    </span>
  );
}
