import React from "react";

interface NetworkOrbProps {
  size?: number;
  className?: string;
  subtle?: boolean;
}

export const NetworkOrb: React.FC<NetworkOrbProps> = ({
  size = 280,
  className = "",
  subtle = false,
}) => {
  const center = size / 2;
  const opacity = subtle ? 0.08 : 0.85;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size, opacity }}
      aria-hidden="true"
    >
      {/* Central Core Pulse */}
      <div
        className="absolute rounded-full bg-accent/20 blur-xl motion-safe:animate-pulse"
        style={{ width: size * 0.45, height: size * 0.45 }}
      />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
            <stop offset="70%" stopColor="hsl(var(--accent))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Static concentric orbit guide rings */}
        <circle
          cx={center}
          cy={center}
          r={size * 0.22}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1"
          strokeDasharray="4 6"
          strokeOpacity="0.25"
        />
        <circle
          cx={center}
          cy={center}
          r={size * 0.38}
          fill="none"
          stroke="hsl(var(--border-strong))"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeOpacity="0.35"
        />

        {/* Center Node */}
        <circle cx={center} cy={center} r={size * 0.09} fill="url(#hubGlow)" />
        <circle cx={center} cy={center} r={6} fill="hsl(var(--accent))" />

        {/* Orbit Ring 1 (Inner, rotates clockwise) */}
        <g
          className="motion-safe:animate-[network-orbit_32s_linear_infinite]"
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {/* Inner Node 1 */}
          <line
            x1={center}
            y1={center}
            x2={center + size * 0.22}
            y2={center}
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          <circle
            cx={center + size * 0.22}
            cy={center}
            r={5}
            fill="hsl(var(--brand-oxblood))"
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
          />

          {/* Inner Node 2 */}
          <line
            x1={center}
            y1={center}
            x2={center - size * 0.22 * 0.5}
            y2={center + size * 0.22 * 0.866}
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          <circle
            cx={center - size * 0.22 * 0.5}
            cy={center + size * 0.22 * 0.866}
            r={4.5}
            fill="hsl(var(--status-received))"
            stroke="hsl(var(--surface-raised))"
            strokeWidth="1.5"
          />

          {/* Inner Node 3 */}
          <line
            x1={center}
            y1={center}
            x2={center - size * 0.22 * 0.5}
            y2={center - size * 0.22 * 0.866}
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          <circle
            cx={center - size * 0.22 * 0.5}
            cy={center - size * 0.22 * 0.866}
            r={4}
            fill="hsl(var(--status-in-transit))"
            stroke="hsl(var(--surface-raised))"
            strokeWidth="1"
          />
        </g>

        {/* Orbit Ring 2 (Outer, rotates counter-clockwise) */}
        <g
          className="motion-safe:animate-[network-orbit-reverse_48s_linear_infinite]"
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          {/* Outer Node 1 */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - size * 0.38}
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            strokeOpacity="0.15"
          />
          <circle
            cx={center}
            cy={center - size * 0.38}
            r={6}
            fill="hsl(var(--accent))"
            stroke="hsl(var(--surface-raised))"
            strokeWidth="2"
          />

          {/* Outer Node 2 */}
          <circle
            cx={center + size * 0.38 * 0.866}
            cy={center + size * 0.38 * 0.5}
            r={5}
            fill="hsl(var(--text-muted))"
            stroke="hsl(var(--surface-raised))"
            strokeWidth="1.5"
          />

          {/* Outer Node 3 */}
          <circle
            cx={center - size * 0.38 * 0.866}
            cy={center + size * 0.38 * 0.5}
            r={5.5}
            fill="hsl(var(--status-received))"
            stroke="hsl(var(--surface-raised))"
            strokeWidth="1.5"
          />

          {/* Outer Node 4 */}
          <circle
            cx={center + size * 0.38 * 0.707}
            cy={center - size * 0.38 * 0.707}
            r={3.5}
            fill="hsl(var(--brand-oxblood))"
          />
        </g>
      </svg>
    </div>
  );
};
