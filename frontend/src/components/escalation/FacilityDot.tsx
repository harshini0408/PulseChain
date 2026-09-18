/**
 * frontend/src/components/escalation/FacilityDot.tsx
 *
 * A single facility node on the SVG corridor map.
 * Blood Centres use a filled circle; Hospitals use a rounded rect icon.
 */

import { motion } from "framer-motion";
import type { Facility } from "@pulsechain/shared";

interface FacilityDotProps {
  facility: Facility;
  x: number;
  y: number;
  isOrigin?: boolean;
  isActive?: boolean;   // has an active offer at this ring tick
  ring?: number;        // 1 | 2 | 3 — for colour tint
}

const RING_COLOURS: Record<number, string> = {
  1: "#dc2626",   // crimson  ring-1
  2: "#f59e0b",   // amber    ring-2
  3: "#6366f1",   // indigo   ring-3
};

export function FacilityDot({ facility, x, y, isOrigin = false, isActive = false, ring }: FacilityDotProps) {
  const isCentre = facility.type === "BLOOD_CENTRE";
  const r = isOrigin ? 10 : isCentre ? 7 : 5.5;
  const fill = isOrigin
    ? "#dc2626"
    : isActive && ring
    ? RING_COLOURS[ring] ?? "#6b7280"
    : isCentre
    ? "#374151"
    : "#6b7280";

  const labelX = x;
  const labelY = y + r + 10;

  return (
    <g>
      <motion.circle
        cx={x}
        cy={y}
        r={r}
        fill={fill}
        stroke="white"
        strokeWidth={isOrigin ? 2.5 : 1.5}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      />
      {isActive && ring && (
        <motion.circle
          cx={x}
          cy={y}
          r={r + 4}
          fill="none"
          stroke={RING_COLOURS[ring]}
          strokeWidth={1.5}
          opacity={0.55}
          animate={{ r: [r + 3, r + 8], opacity: [0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fill="#374151"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={isOrigin ? "700" : "400"}
      >
        {/* Short name: abbreviate to ≤14 chars */}
        {facility.name.length > 14 ? facility.name.slice(0, 13) + "…" : facility.name}
      </text>
    </g>
  );
}
