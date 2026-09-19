import React from "react";

export type FlowLineState = "inactive" | "searching" | "active" | "completed" | "failed";

interface FlowLineProps {
  state?: FlowLineState;
  originLabel?: string;
  targetLabel?: string;
  className?: string;
  showPulse?: boolean;
}

export const FlowLine: React.FC<FlowLineProps> = ({
  state = "active",
  originLabel,
  targetLabel,
  className = "",
  showPulse = true,
}) => {
  const stateStyles: Record<
    FlowLineState,
    { line: string; dot: string; pulseColor: string }
  > = {
    inactive: {
      line: "bg-border",
      dot: "bg-text-subtle",
      pulseColor: "transparent",
    },
    searching: {
      line: "bg-status-in-transit/40",
      dot: "bg-status-in-transit",
      pulseColor: "bg-status-in-transit",
    },
    active: {
      line: "bg-accent/40",
      dot: "bg-accent",
      pulseColor: "bg-accent",
    },
    completed: {
      line: "bg-status-received/50",
      dot: "bg-status-received",
      pulseColor: "bg-status-received",
    },
    failed: {
      line: "bg-status-lost/50",
      dot: "bg-status-lost",
      pulseColor: "bg-status-lost",
    },
  };

  const current = stateStyles[state];

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <div className="relative flex items-center w-full py-1">
        {/* Origin Node */}
        <div
          className={`h-2.5 w-2.5 rounded-full ${current.dot} ring-2 ring-surface-raised flex-shrink-0 z-10 transition-colors`}
        />

        {/* Track Line */}
        <div className="relative flex-1 h-[2px] mx-1 bg-border/60 overflow-hidden">
          <div className={`absolute inset-0 ${current.line}`} />
          {showPulse && (state === "active" || state === "searching") && (
            <div
              className={`absolute top-0 bottom-0 w-8 -translate-x-full rounded-full ${current.pulseColor} blur-[1px] motion-safe:animate-[flow-pulse_2s_cubic-bezier(0.4,0,0.2,1)_infinite]`}
            />
          )}
        </div>

        {/* Target Node */}
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            state === "completed" ? current.dot : "bg-surface-raised border-2 border-border-strong"
          } flex-shrink-0 z-10 transition-colors`}
        />
      </div>

      {(originLabel || targetLabel) && (
        <div className="flex justify-between text-[11px] text-text-muted font-medium tracking-tight">
          <span>{originLabel}</span>
          <span>{targetLabel}</span>
        </div>
      )}
    </div>
  );
};
