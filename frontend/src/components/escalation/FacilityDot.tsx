/**
 * A facility on the corridor map. Blood centres are drawn larger than
 * hospitals because the corridor radiates from them, and the origin of an
 * active escalation is drawn larger still.
 */

import type { Facility } from "@pulsechain/shared";
import { ringToken } from "../../lib/status";

interface FacilityDotProps {
  facility: Facility;
  x: number;
  y: number;
  isOrigin?: boolean;
  /** Inside the currently escalating ring, so it is being offered the unit. */
  inActiveRing?: boolean;
  /** This facility claimed the unit. */
  isClaimant?: boolean;
  ring?: number;
  onSelect?: () => void;
}

export function FacilityDot({
  facility,
  x,
  y,
  isOrigin = false,
  inActiveRing = false,
  isClaimant = false,
  ring,
  onSelect,
}: FacilityDotProps) {
  const radius = isOrigin ? 7 : facility.type === "BLOOD_CENTRE" ? 5.5 : 4;

  const fill = isOrigin
    ? "hsl(var(--brand-oxblood))"
    : isClaimant
      ? "hsl(var(--status-received))"
      : inActiveRing && ring
        ? `hsl(var(${ringToken(ring).cssVar}))`
        : "hsl(var(--text-subtle))";

  return (
    <g
      className={onSelect ? "cursor-pointer" : undefined}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
    >
      <title>
        {facility.name} · {facility.city}
        {isOrigin ? " · origin" : isClaimant ? " · claimed this unit" : ""}
      </title>

      {(inActiveRing || isClaimant) && !isOrigin && (
        <circle cx={x} cy={y} r={radius + 4} fill={fill} opacity={0.18} />
      )}

      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={fill}
        stroke="hsl(var(--surface-raised))"
        strokeWidth={1.5}
      />

      {(isOrigin || isClaimant) && (
        <text
          x={x}
          y={y - radius - 5}
          textAnchor="middle"
          fontSize="8"
          fontWeight="600"
          fill="hsl(var(--text))"
          stroke="hsl(var(--surface-sunken))"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {facility.name.split(" ").slice(0, 2).join(" ")}
        </text>
      )}
    </g>
  );
}
