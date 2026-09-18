/**
 * An escalation ring on the map. The active ring expands outward on a loop;
 * inactive rings are drawn as quiet guides so the corridor keeps its shape
 * even when nothing is happening.
 *
 * Motion place three of three. Under prefers-reduced-motion the pulse becomes
 * a static circle.
 */

import { ringToken } from "../../lib/status";
import { usePrefersReducedMotion } from "../../lib/motion";

interface RingPulseProps {
  cx: number;
  cy: number;
  r: number;
  ring: number;
  active?: boolean;
}

export function RingPulse({ cx, cy, r, ring, active = false }: RingPulseProps) {
  const reducedMotion = usePrefersReducedMotion();
  const stroke = `hsl(var(${ringToken(ring).cssVar}))`;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 1.6 : 0.9}
        strokeDasharray={active ? undefined : "4 5"}
        opacity={active ? 0.75 : 0.28}
      />

      {active && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={stroke}
          opacity={reducedMotion ? 0.07 : undefined}
          style={
            reducedMotion
              ? undefined
              : {
                  transformOrigin: `${cx}px ${cy}px`,
                  animation: "ring-pulse 2.6s ease-out infinite",
                  opacity: 0.12,
                }
          }
        />
      )}
    </g>
  );
}
