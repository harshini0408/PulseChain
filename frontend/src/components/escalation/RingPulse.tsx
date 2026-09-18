/**
 * frontend/src/components/escalation/RingPulse.tsx
 *
 * Animated concentric ring for the SVG corridor map.
 * Shows the 10km / 30km / outer-ring boundaries emanating from the origin.
 */

import { motion } from "framer-motion";

interface RingPulseProps {
  cx: number;
  cy: number;
  r: number;          // pixel radius on the SVG
  ring: 1 | 2 | 3;   // determines colour
  active: boolean;    // if true, the ring "breathes" with animation
}

const RING_COLOURS: Record<number, { stroke: string; fill: string }> = {
  1: { stroke: "#dc2626", fill: "rgba(220,38,38,0.04)" },  // crimson
  2: { stroke: "#f59e0b", fill: "rgba(245,158,11,0.04)" }, // amber
  3: { stroke: "#6366f1", fill: "rgba(99,102,241,0.04)" }, // indigo
};

export function RingPulse({ cx, cy, r, ring, active }: RingPulseProps) {
  const { stroke, fill } = RING_COLOURS[ring];

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill={active ? fill : "transparent"}
      stroke={stroke}
      strokeWidth={active ? 1.5 : 0.8}
      strokeDasharray={active ? undefined : "4 3"}
      opacity={active ? 0.9 : 0.3}
      animate={
        active
          ? {
              r: [r, r + 4, r],
              opacity: [0.85, 0.5, 0.85],
            }
          : {}
      }
      transition={
        active
          ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
          : {}
      }
    />
  );
}
