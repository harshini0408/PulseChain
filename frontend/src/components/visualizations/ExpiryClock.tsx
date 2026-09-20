import React, { useMemo } from "react";

interface ExpiryClockProps {
  expiresAt: string | Date | number;
  totalDurationHours?: number; // default 48h for platelets
  compact?: boolean;
  size?: number;
  className?: string;
  showLabels?: boolean;
}

export const ExpiryClock: React.FC<ExpiryClockProps> = ({
  expiresAt,
  totalDurationHours = 48,
  compact = false,
  size = compact ? 34 : 72,
  className = "",
  showLabels = true,
}) => {
  const { remainingHours, remainingMinutes, progress, urgency } = useMemo(() => {
    const target = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = target - now;
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) {
      return { remainingHours: 0, remainingMinutes: 0, progress: 0, urgency: "expired" as const };
    }

    const hrs = Math.floor(diffHrs);
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const prog = Math.min(100, Math.max(0, (diffHrs / totalDurationHours) * 100));

    let urg: "normal" | "warning" | "critical" = "normal";
    if (diffHrs <= 6) {
      urg = "critical";
    } else if (diffHrs <= 16) {
      urg = "warning";
    }

    return {
      remainingHours: hrs,
      remainingMinutes: mins,
      progress: prog,
      urgency: urg,
    };
  }, [expiresAt, totalDurationHours]);

  const strokeWidth = compact ? 3 : 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorMap = {
    normal: "hsl(var(--status-received))",
    warning: "hsl(var(--status-in-transit))",
    critical: "hsl(var(--status-lost))",
    expired: "hsl(var(--status-expired))",
  };

  const strokeColor = colorMap[urgency];

  if (compact) {
    const effectiveSize = Math.max(28, size);
    const strokeWidth = effectiveSize <= 30 ? 2.5 : 3;
    const radius = (effectiveSize - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const fontSizeClass =
      effectiveSize <= 28
        ? "text-[7.5px]"
        : effectiveSize <= 32
        ? "text-[8.5px]"
        : "text-[10px]";

    return (
      <div
        className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
        style={{ width: effectiveSize, height: effectiveSize }}
        title={`${remainingHours}h ${remainingMinutes}m remaining`}
      >
        <svg width={effectiveSize} height={effectiveSize} className="-rotate-90">
          <circle
            cx={effectiveSize / 2}
            cy={effectiveSize / 2}
            r={radius}
            fill="transparent"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={effectiveSize / 2}
            cy={effectiveSize / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {urgency === "critical" && (
          <div
            className="absolute inset-0 rounded-full motion-safe:animate-[ring-pulse_2s_infinite]"
            style={{ border: `1.5px solid ${strokeColor}` }}
          />
        )}
        <span
          className={`absolute ${fontSizeClass} font-bold font-mono tracking-tighter leading-none text-center select-none`}
          style={{ color: strokeColor }}
        >
          {remainingHours}h
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {urgency === "critical" && (
          <div
            className="absolute inset-0 rounded-full motion-safe:animate-[ring-pulse_2s_infinite]"
            style={{ border: `2px solid ${strokeColor}` }}
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-lg font-bold tabular-nums leading-none"
            style={{ color: strokeColor }}
          >
            {remainingHours}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-text-subtle font-medium mt-0.5">
            hrs
          </span>
        </div>
      </div>

      {showLabels && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: strokeColor }}
            >
              {remainingHours}h {remainingMinutes}m
            </span>
            <span className="text-xs text-text-muted font-normal">left</span>
          </div>
          <span className="text-[11px] text-text-subtle font-medium uppercase tracking-wider">
            {urgency === "critical"
              ? "Urgent rescue needed"
              : urgency === "warning"
              ? "Approaching risk window"
              : "Standard viability"}
          </span>
        </div>
      )}
    </div>
  );
};
