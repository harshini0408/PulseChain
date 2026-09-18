/**
 * The corridor, hand-drawn as inline SVG.
 *
 * There are no map tiles and no external geo service: every facility carries a
 * real lat/lng from GET /facilities, and those are projected onto a locally
 * flat plane centred on the escalation's origin. Ring radii come from
 * shared/src/config.ts and are converted at the same km-per-pixel scale as the
 * facility positions, so a dot inside the ring on screen really is inside the
 * ring in kilometres.
 *
 * WHAT THIS CAN AND CANNOT SHOW
 * Facilities inside the current ring are highlighted as the ones being offered
 * to, computed by haversine from the origin. It is not the same as "holds an
 * open offer": no deployed endpoint lists offers network-wide, so that would
 * have to be invented. The claimant, on the other hand, is real — it comes
 * from the unit's own `claimedBy`.
 */

import { useMemo } from "react";
import { getConfig, type Facility } from "@pulsechain/shared";
import type { ActiveEscalation } from "../../api/client";
import { haversineKm, project } from "../../lib/geo";
import { FacilityDot } from "./FacilityDot";
import { RingPulse } from "./RingPulse";

const SVG_SIZE = 460;
const PADDING = 28;
const CENTRE = { x: SVG_SIZE / 2, y: SVG_SIZE / 2 };

interface CorridorMapProps {
  facilities: Facility[];
  escalation?: ActiveEscalation;
  /** Facility that claimed the escalating unit, when one has. */
  claimantFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
}

export function CorridorMap({
  facilities,
  escalation,
  claimantFacilityId,
  onSelectFacility,
}: CorridorMapProps) {
  const { rings } = getConfig();

  const originId =
    escalation?.originFacilityId ?? facilities.find((f) => f.type === "BLOOD_CENTRE")?.facilityId;
  const origin = facilities.find((f) => f.facilityId === originId);

  const currentRing = escalation?.currentRing;

  // Real distances from the origin, before any scaling decision.
  const distances = useMemo(() => {
    if (!origin) return [];
    return facilities.map((facility) => ({
      facility,
      distanceKm: haversineKm(origin.lat, origin.lng, facility.lat, facility.lng),
    }));
  }, [facilities, origin]);

  /**
   * Scale to the ring that is escalating, not to the whole network.
   *
   * The corridor is not evenly spread: seven facilities sit within 5 km of the
   * centre and the furthest is 90 km out in Erode. Fitting the frame to the
   * furthest one shrinks the rings to dots; fitting it to the widest ring
   * buries the dense middle in a clump. Neither is readable.
   *
   * So the view fits the ring currently being offered to, which is the set the
   * coordinator is actually looking at. Facilities beyond that fall outside the
   * frame and are counted underneath rather than silently dropped. The
   * remaining tightness in the middle is real geography — those hospitals are
   * genuinely within a few kilometres of each other, and spreading them out
   * would be a lie.
   */
  const fitKm = useMemo(() => {
    const activeRingKm = rings.find((r) => r.ring === (currentRing ?? 1))?.maxKm;
    const ringOneKm = rings.find((r) => r.ring === 1)?.maxKm ?? 10;
    // Ring 3 is unbounded (999 km), so never scale to it — fall back to ring 2.
    const bounded =
      activeRingKm && activeRingKm < 500
        ? activeRingKm
        : (rings.find((r) => r.ring === 2)?.maxKm ?? ringOneKm);
    return bounded * 1.15;
  }, [rings, currentRing]);

  const pxPerKm = (SVG_SIZE / 2 - PADDING) / fitKm;

  /** Facilities the current scale cannot show. Counted, never hidden quietly. */
  const offFrameCount = distances.filter((d) => d.distanceKm > fitKm).length;

  const placed = useMemo(
    () =>
      origin
        ? distances
            .filter(({ distanceKm }) => distanceKm <= fitKm)
            .map(({ facility, distanceKm }) => ({
            facility,
            distanceKm,
            band: rings.find((r) => distanceKm > r.minKm && distanceKm <= r.maxKm)?.ring,
            ...project(facility.lat, facility.lng, origin.lat, origin.lng, pxPerKm, CENTRE),
          }))
        : [],
    [distances, origin, pxPerKm, rings, fitKm],
  );

  const claimant = placed.find((p) => p.facility.facilityId === claimantFacilityId);

  if (!origin) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-sm text-text-muted">No facilities to place yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="aspect-square w-full rounded-xl bg-surface-sunken"
        role="img"
        aria-label={
          escalation
            ? `Corridor map, escalation at ring ${escalation.currentRing} from ${origin.name}`
            : "Corridor map, no active escalation"
        }
      >
        <defs>
          <pattern id="corridor-grid" width="23" height="23" patternUnits="userSpaceOnUse">
            <path
              d="M 23 0 L 0 0 0 23"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              opacity="0.6"
            />
          </pattern>
        </defs>
        <rect width={SVG_SIZE} height={SVG_SIZE} fill="url(#corridor-grid)" />

        {/* Rings, outermost first so the inner ones draw on top. A ring wider
            than the fitted frame is skipped rather than clipped to an arc. */}
        {[2, 1].map((ring) => {
          const band = rings.find((r) => r.ring === ring);
          if (!band || band.maxKm > fitKm) return null;
          return (
            <RingPulse
              key={ring}
              cx={CENTRE.x}
              cy={CENTRE.y}
              r={band.maxKm * pxPerKm}
              ring={ring}
              active={currentRing === ring}
            />
          );
        })}

        {/* Ring labels, tucked just inside each ring. */}
        {[1, 2].map((ring) => {
          const band = rings.find((r) => r.ring === ring);
          if (!band || band.maxKm > fitKm) return null;
          return (
            <text
              key={`label-${ring}`}
              x={CENTRE.x + band.maxKm * pxPerKm - 6}
              y={CENTRE.y - 6}
              textAnchor="end"
              fontSize="9"
              fontWeight="600"
              fill={`hsl(var(--ring-${ring}))`}
              opacity={0.85}
            >
              {band.maxKm} km
            </text>
          );
        })}

        {/* Spokes to everyone currently being offered the unit. */}
        {currentRing &&
          placed
            .filter((p) => p.band === currentRing && p.facility.facilityId !== originId)
            .map((p) => (
              <line
                key={`spoke-${p.facility.facilityId}`}
                x1={CENTRE.x}
                y1={CENTRE.y}
                x2={p.x}
                y2={p.y}
                stroke={`hsl(var(--ring-${currentRing}))`}
                strokeWidth={0.9}
                strokeDasharray="3 4"
                opacity={0.45}
              />
            ))}

        {/* The claim: a solid line from origin to whoever took it. */}
        {claimant && (
          <line
            x1={CENTRE.x}
            y1={CENTRE.y}
            x2={claimant.x}
            y2={claimant.y}
            stroke="hsl(var(--status-received))"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}

        {offFrameCount > 0 && (
          <text
            x={SVG_SIZE / 2}
            y={SVG_SIZE - 10}
            textAnchor="middle"
            fontSize="9"
            fill="hsl(var(--text-subtle))"
          >
            {offFrameCount} further {offFrameCount === 1 ? "facility" : "facilities"} beyond{" "}
            {Math.round(fitKm)} km
          </text>
        )}

        {placed.map((p) => (
          <FacilityDot
            key={p.facility.facilityId}
            facility={p.facility}
            x={p.x}
            y={p.y}
            isOrigin={p.facility.facilityId === originId}
            inActiveRing={Boolean(currentRing) && p.band === currentRing}
            isClaimant={p.facility.facilityId === claimantFacilityId}
            ring={p.band}
            onSelect={onSelectFacility ? () => onSelectFacility(p.facility.facilityId) : undefined}
          />
        ))}
      </svg>
    </div>
  );
}
