/**
 * Names a component and the clock it runs on. Both the label and the window
 * come from lib/status.ts, which reads the thresholds out of
 * shared/src/config.ts — nothing here is written down twice.
 */

import { Clock } from "lucide-react";
import type { Component } from "@pulsechain/shared";
import { componentClock } from "../../lib/status";

interface ComponentClockBadgeProps {
  component: Component;
  /** Show the "48-hour clock" caption alongside the component name. */
  withClock?: boolean;
  size?: "sm" | "md";
}

export function ComponentClockBadge({
  component,
  withClock = false,
  size = "sm",
}: ComponentClockBadgeProps) {
  const clock = componentClock(component);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        clock.pill,
      ].join(" ")}
      title={`${clock.label} · ${clock.shelfLifeDays}-day shelf life · alerts at ${clock.thresholdHours}h remaining`}
    >
      <span className={["h-1.5 w-1.5 rounded-full", clock.dot].join(" ")} />
      {clock.label}
      {withClock && (
        <>
          <Clock className="h-3 w-3 opacity-60" />
          <span className="font-medium opacity-80">{clock.clockLabel}</span>
        </>
      )}
    </span>
  );
}
