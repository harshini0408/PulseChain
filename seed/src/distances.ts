/**
 * seed/src/distances.ts
 *
 * Computes the haversine distance for every ordered facility pair (A→B and B→A)
 * and returns DynamoDB items using keys.ts builders.
 *
 * Zero-padding invariant: formatted SK strings must sort in the same order as
 * the numeric distances. This is asserted before any items are emitted.
 */

import { distanceKey } from "@pulsechain/shared";
import { padDistance } from "@pulsechain/shared";
import { FACILITIES } from "./generate.js";
import { haversineKm } from "./distances-util.js";

// ---------------------------------------------------------------------------
// Zero-padding sort assertion
// ---------------------------------------------------------------------------

/**
 * Verifies that the DIST# zero-padded SK prefix preserves numeric sort order.
 * Two pairs with equal km are allowed to differ in SK (the tiebreak is the
 * facility ID suffix, which is fine — what we care about is that a shorter km
 * never sorts AFTER a longer km when comparing the numeric prefix alone).
 */
function assertPaddingOrderIsCorrect(pairs: Array<{ km: number; sk: string }>): void {
  const sorted = [...pairs].sort((a, b) => a.km - b.km || a.sk.localeCompare(b.sk));
  const sortedBySk = [...pairs].sort((a, b) => a.sk.localeCompare(b.sk));

  // The invariant: for any two pairs where km_i < km_j,
  // their formatted SK must also satisfy sk_i < sk_j (prefix ordering only).
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.km >= b.km) continue; // equal km is a tie — skip
      // Extract the DIST#nnn.n# prefix (first 12 chars)
      const prefixA = a.sk.slice(0, 12);
      const prefixB = b.sk.slice(0, 12);
      if (prefixA.localeCompare(prefixB) > 0) {
        throw new Error(
          `[distances] padDistance sort invariant violated:\n` +
          `  km=${a.km.toFixed(1)} maps to SK prefix "${prefixA}"\n` +
          `  km=${b.km.toFixed(1)} maps to SK prefix "${prefixB}"\n` +
          `  A shorter distance must sort BEFORE a longer one lexicographically.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Generate distance items
// ---------------------------------------------------------------------------

export interface DistanceItem {
  _tag: "DISTANCE";
  PK: string;
  SK: string;
  entityType: "DISTANCE";
  fromFacilityId: string;
  toFacilityId: string;
  distanceKm: number;
}

export function generateDistanceItems(): DistanceItem[] {
  const items: DistanceItem[] = [];

  // Pre-compute all numeric distances and validate padding order per origin facility
  for (const origin of FACILITIES) {
    const pairs: Array<{ km: number; sk: string; dest: string }> = [];

    for (const dest of FACILITIES) {
      if (dest.facilityId === origin.facilityId) continue;

      const km = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
      const sk = `DIST#${padDistance(km)}#${dest.facilityId}`;
      pairs.push({ km, sk, dest: dest.facilityId });
    }

    // Assert zero-padding order is preserved for this origin's pairs
    assertPaddingOrderIsCorrect(pairs.map((p) => ({ km: p.km, sk: p.sk })));

    // Emit items
    for (const p of pairs) {
      const roundedKm = Math.round(p.km * 10) / 10;
      const keys = distanceKey(origin.facilityId, roundedKm, p.dest);
      items.push({
        _tag: "DISTANCE",
        ...keys,
        entityType: "DISTANCE",
        fromFacilityId: origin.facilityId,
        toFacilityId: p.dest,
        distanceKm: roundedKm,
      });
    }
  }

  return items;
}

if (process.argv[1] && (process.argv[1].endsWith("distances.ts") || process.argv[1].endsWith("distances.js"))) {
  const items = generateDistanceItems();
  console.log(`\nGenerated ${items.length} distance items (${FACILITIES.length} × ${FACILITIES.length - 1} directed pairs)\n`);

  // Print the ring breakdown for FAC_CBE_SNBC (the main demo origin)
  const ORIGIN = "FAC_CBE_SNBC";
  const fromOrigin = items
    .filter((i) => i.fromFacilityId === ORIGIN)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  console.log(`Distances from ${ORIGIN}:`);
  for (const d of fromOrigin) {
    const ring = d.distanceKm <= 10 ? "Ring 1" : d.distanceKm <= 30 ? "Ring 2" : "Ring 3";
    const name = FACILITIES.find((f) => f.facilityId === d.toFacilityId)?.name ?? d.toFacilityId;
    console.log(`  ${ring}  ${d.distanceKm.toFixed(1).padStart(6)} km  ${d.SK.padEnd(28)}  ${name}`);
  }
}
