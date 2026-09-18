/**
 * frontend/src/components/stock/ExpiryCountdown.tsx
 *
 * Real-time ticking client-side countdown display for blood unit expiry.
 */

import React from "react";
import { useCountdown } from "../../lib/countdown";
import { Clock } from "lucide-react";

import { getConfig } from "@pulsechain/shared";

interface ExpiryCountdownProps {
  expiresAt: string;
  isPastThreshold?: boolean;
}

export const ExpiryCountdown: React.FC<ExpiryCountdownProps> = ({
  expiresAt,
  isPastThreshold,
}) => {
  const countdown = useCountdown(expiresAt);
  const cfg = getConfig();

  if (countdown.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
        <Clock className="w-3.5 h-3.5" />
        EXPIRED
      </span>
    );
  }

  // Highlight urgent countdowns inside threshold
  const isUrgent = isPastThreshold || countdown.totalSeconds < (cfg.thresholdHours.PLATELETS * 3600);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight ${
        isUrgent
          ? "text-amber-600 dark:text-amber-400 animate-pulse"
          : "text-slate-700 dark:text-slate-300"
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-amber-500" : "text-slate-400"}`} />
      {countdown.formatted}
    </span>
  );
};
