import React from "react";

interface PulseLineProps {
  className?: string;
  width?: number | string;
  height?: number;
  color?: string;
  animated?: boolean;
}

export const PulseLine: React.FC<PulseLineProps> = ({
  className = "",
  width = "100%",
  height = 24,
  color = "currentColor",
  animated = true,
}) => {
  return (
    <div
      className={`relative flex items-center overflow-hidden ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 24"
        preserveAspectRatio="none"
        className="w-full h-full stroke-current"
        style={{ color }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 12 L70 12 L80 12 L86 5 L92 19 L98 2 L106 22 L112 10 L118 13 L125 12 L210 12 L218 12 L224 5 L230 19 L236 2 L244 22 L250 10 L256 13 L263 12 L320 12"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
        {animated && (
          <path
            d="M0 12 L70 12 L80 12 L86 5 L92 19 L98 2 L106 22 L112 10 L118 13 L125 12 L210 12 L218 12 L224 5 L230 19 L236 2 L244 22 L250 10 L256 13 L263 12 L320 12"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60 260"
            className="motion-safe:animate-[pulse-travel_2.8s_linear_infinite]"
          />
        )}
      </svg>
    </div>
  );
};
