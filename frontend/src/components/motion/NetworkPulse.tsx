import React from "react";

interface NetworkPulseProps {
  className?: string;
  size?: number;
  nodeColor?: string;
  accentColor?: string;
}

export const NetworkPulse: React.FC<NetworkPulseProps> = ({
  className = "",
  size = 40,
  nodeColor = "hsl(var(--text-subtle))",
  accentColor = "hsl(var(--accent))",
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 0.6 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 80 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        {/* Connecting Lines */}
        <line
          x1="12"
          y1="24"
          x2="40"
          y2="12"
          stroke={nodeColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <line
          x1="12"
          y1="24"
          x2="40"
          y2="36"
          stroke={nodeColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <line
          x1="40"
          y1="12"
          x2="68"
          y2="24"
          stroke={nodeColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <line
          x1="40"
          y1="36"
          x2="68"
          y2="24"
          stroke={nodeColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <line
          x1="40"
          y1="12"
          x2="40"
          y2="36"
          stroke={nodeColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Nodes */}
        <circle cx="12" cy="24" r="4.5" fill={nodeColor} fillOpacity="0.7" />
        <circle cx="40" cy="12" r="5" fill={accentColor} className="animate-pulse" />
        <circle cx="40" cy="36" r="4" fill={nodeColor} fillOpacity="0.7" />
        <circle cx="68" cy="24" r="5.5" fill={accentColor} fillOpacity="0.9" />

        {/* Ambient Ring on central nodes */}
        <circle
          cx="40"
          cy="12"
          r="8"
          stroke={accentColor}
          strokeWidth="1"
          strokeOpacity="0.4"
          className="motion-safe:animate-[ring-pulse_2s_infinite]"
        />
      </svg>
    </div>
  );
};
