/**
 * frontend/src/components/escalation/CorridorMap.tsx
 *
 * Hand-drawn inline SVG corridor map.
 *
 * Projection:
 *   The Coimbatore region spans ~0.8° lat × 0.9° lng.
 *   We centre on the origin facility and scale longitude by cos(lat)
 *   to produce a locally-flat projection.
 *
 * Ring radii are derived from the actual km-to-pixel scale:
 *   We size the SVG so 1 km ≈ 6 px, giving:
 *     Ring 1 (10 km) → 60 px
 *     Ring 2 (30 km) → 180 px
 *   A padding margin caps the viewport at 420×400 px.
 *
 * All facility positions use the real lat/lng from the backend.
 * No eye-balling.
 */

import { useMemo } from "react";
import type { Facility } from "@pulsechain/shared";
import type { ActiveEscalation } from "../../api/client";
import { FacilityDot } from "./FacilityDot";
import { RingPulse } from "./RingPulse";

// SVG canvas dimensions
const SVG_W = 440;
const SVG_H = 400;
const CX = SVG_W / 2;  // centre x
const CY = SVG_H / 2;  // centre y

// Scale: 1 degree latitude ≈ 111 km → pixels
const KM_PER_DEG_LAT = 111.0;
const PX_PER_KM = 5.8;   // tweak so the 30 km ring sits near the edge

function latLngToXY(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): { x: number; y: number } {
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  const dx = (lng - originLng) * cosLat * KM_PER_DEG_LAT * PX_PER_KM;
  const dy = -(lat - originLat) * KM_PER_DEG_LAT * PX_PER_KM; // SVG y flips N/S
  return { x: CX + dx, y: CY + dy };
}

function kmToPixels(km: number): number {
  return km * PX_PER_KM;
}

interface CorridorMapProps {
  facilities: Facility[];
  escalations: ActiveEscalation[];
  selected: string | null;   // selected escalationId
}

export function CorridorMap({ facilities, escalations, selected }: CorridorMapProps) {
  // Determine origin: if a selected escalation has an origin facility, use it;
  // otherwise fall back to the first BLOOD_CENTRE in the list.
  const selectedEsc = escalations.find((e) => e.escalationId === selected);
  const originId =
    selectedEsc?.originFacilityId ??
    facilities.find((f) => f.type === "BLOOD_CENTRE")?.facilityId;
  const origin = facilities.find((f) => f.facilityId === originId);
  const originLat = origin?.lat ?? 11.0108;
  const originLng = origin?.lng ?? 76.9628;

  // Determine which rings are active for the selected escalation
  const activeRings = useMemo<Set<number>>(() => {
    if (!selectedEsc) return new Set();
    return new Set([selectedEsc.currentRing]);
  }, [selectedEsc]);

  // Build a set of facility IDs that have active offers in each ring
  const activeOffersByFacility = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    // For the selected escalation we don't have offer-level data here,
    // but we can mark origin as ring 0 and all HOSPITAL facilities within
    // the active ring as candidates.
    return map;
  }, []);

  // Project all facilities onto the SVG plane
  const projected = useMemo(
    () =>
      facilities.map((f) => ({
        facility: f,
        ...latLngToXY(f.lat, f.lng, originLat, originLng),
        isOrigin: f.facilityId === originId,
      })),
    [facilities, originLat, originLng, originId]
  );

  // Ring pixel radii
  const r1 = kmToPixels(10);
  const r2 = kmToPixels(30);
  const r3 = kmToPixels(55); // "outer / regional" visual boundary

  return (
    <div className="relative w-full" style={{ paddingBottom: "90.9%" }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="absolute inset-0 w-full h-full"
        style={{ background: "transparent" }}
        aria-label="PulseChain escalation corridor map"
      >
        {/* ── Grid / watermark ── */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#grid)" rx="12" />

        {/* ── Ring 3 (outer / regional) ── */}
        <RingPulse cx={CX} cy={CY} r={r3} ring={3} active={activeRings.has(3)} />

        {/* ── Ring 2 (30 km) ── */}
        <RingPulse cx={CX} cy={CY} r={r2} ring={2} active={activeRings.has(2)} />

        {/* ── Ring 1 (10 km) ── */}
        <RingPulse cx={CX} cy={CY} r={r1} ring={1} active={activeRings.has(1)} />

        {/* ── Ring labels ── */}
        <text x={CX + r1 + 3} y={CY - 3} fontSize="8" fill="#dc2626" opacity={0.75} fontFamily="Inter, sans-serif">10 km</text>
        <text x={CX + r2 + 3} y={CY - 3} fontSize="8" fill="#f59e0b" opacity={0.75} fontFamily="Inter, sans-serif">30 km</text>

        {/* ── Connector lines from origin to facilities in active ring ── */}
        {selectedEsc &&
          projected
            .filter((p) => !p.isOrigin)
            .map((p) => {
              // compute distance from origin
              const dx = p.x - CX;
              const dy = p.y - CY;
              const dPx = Math.sqrt(dx * dx + dy * dy);
              const inRing1 = dPx <= r1;
              const inRing2 = dPx > r1 && dPx <= r2;
              const ring = activeRings.has(1) && inRing1 ? 1
                        : activeRings.has(2) && inRing2 ? 2
                        : null;
              if (!ring) return null;
              const strokeColour = ring === 1 ? "#dc2626" : "#f59e0b";
              return (
                <line
                  key={p.facility.facilityId}
                  x1={CX}
                  y1={CY}
                  x2={p.x}
                  y2={p.y}
                  stroke={strokeColour}
                  strokeWidth={0.8}
                  strokeDasharray="3 3"
                  opacity={0.3}
                />
              );
            })}

        {/* ── Facility nodes ── */}
        {projected.map((p) => {
          // determine if this facility is in an active ring
          const dx = p.x - CX;
          const dy = p.y - CY;
          const dPx = Math.sqrt(dx * dx + dy * dy);
          const inRing1 = dPx <= r1;
          const inRing2 = dPx > r1 && dPx <= r2;
          const activeRing = selectedEsc
            ? activeRings.has(1) && inRing1
              ? 1
              : activeRings.has(2) && inRing2
              ? 2
              : activeRings.has(3)
              ? 3
              : undefined
            : undefined;

          return (
            <FacilityDot
              key={p.facility.facilityId}
              facility={p.facility}
              x={p.x}
              y={p.y}
              isOrigin={p.isOrigin}
              isActive={!!activeRing && !p.isOrigin}
              ring={activeRing}
            />
          );
        })}

        {/* ── No-escalation overlay ── */}
        {escalations.length === 0 && (
          <text
            x={CX}
            y={CY + 28}
            textAnchor="middle"
            fontSize="11"
            fill="#6b7280"
            fontFamily="Inter, sans-serif"
          >
            No active escalations
          </text>
        )}
      </svg>
    </div>
  );
}
