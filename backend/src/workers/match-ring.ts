/**
 * backend/src/workers/match-ring.ts
 *
 * Ring matching worker:
 * 1. Loads the unit and origin facility.
 * 2. Ring query: PK = FACILITY#<originId>, SK BETWEEN ring bounds.
 * 3. For each candidate facility:
 *    - Skip origin facility.
 *    - Skip if candidate doesn't handle unit.component.
 *    - Find open requisitions and standing demand for compatible groups.
 *    - Drop INCOMPATIBLE candidates.
 * 4. Scores via shared/scoring.ts, sorts descending, returns top N (config.offersPerRing = 3).
 */

import {
  unitKey,
  facilityKey,
  ringRange,
  getCompatibility,
  scoreOffer,
  getConfig,
  hoursBetween,
  isoNow,
  type Component,
  type BloodGroup,
  type DemandLevel,
  type Urgency,
  type CompatibilityResult,
  type MatchBreakdown,
  type BloodUnit,
  type Facility,
} from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";

export interface MatchCandidate {
  recipientFacilityId: string;
  recipientFacilityName: string;
  distanceKm: number;
  score: number;
  breakdown: MatchBreakdown;
  reason: string;
  requisitionId?: string;
}

export interface MatchRingResult {
  unitId: string;
  ring: 1 | 2 | 3;
  candidates: MatchCandidate[];
}

export async function matchRing(params: {
  unitId: string;
  ring: 1 | 2 | 3;
  now?: string;
}): Promise<MatchRingResult> {
  const ts = params.now ?? isoNow();
  const cfg = getConfig();

  // 1. Load unit
  const unitKeys = unitKey(params.unitId);
  const unit = await getItem<BloodUnit>(unitKeys.PK, unitKeys.SK);
  if (!unit) {
    throw new Error(`[match-ring] Unit not found: ${params.unitId}`);
  }

  const originId = unit.facilityId;
  const originKeys = facilityKey(originId);
  const originFacility = await getItem<Facility>(originKeys.PK, originKeys.SK);
  if (!originFacility) {
    throw new Error(`[match-ring] Origin facility not found: ${originId}`);
  }

  // 2. Ring query
  const ringConfig = cfg.rings.find((r) => r.ring === params.ring);
  if (!ringConfig) {
    throw new Error(`[match-ring] Invalid ring: ${params.ring}`);
  }

  const { from, to } = ringRange(ringConfig.minKm, ringConfig.maxKm);
  const distItems = await queryAll<{
    toFacilityId: string;
    distanceKm: number;
    SK: string;
  }>({
    keyCondition: "PK = :pk AND SK BETWEEN :fromSk AND :toSk",
    values: {
      ":pk": `FACILITY#${originId}`,
      ":fromSk": from,
      ":toSk": to,
    },
    scanForward: true,
  });

  // 3. Query all open requisitions for this component once
  const allOpenReqs = await queryAll<{
    reqId: string;
    hospitalId: string;
    component: Component;
    bloodGroup: BloodGroup;
    urgency: Urgency;
    status: string;
  }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": `OPENREQ#${unit.component}`,
    },
  });

  const hoursRemaining = Math.max(0, hoursBetween(ts, unit.expiresAt));
  const scoredCandidates: MatchCandidate[] = [];

  for (const distItem of distItems) {
    const candidateId = distItem.toFacilityId;
    if (candidateId === originId) continue;

    // Load candidate facility profile
    const candFacility = await getItem<Facility>(`FACILITY#${candidateId}`, "PROFILE");
    if (!candFacility) continue;

    // Skip if candidate does not handle this component
    if (!candFacility.components.includes(unit.component)) continue;

    // Find candidate's open requisitions compatible with unit
    const candReqs = allOpenReqs.filter(
      (r) => r.hospitalId === candidateId && r.status === "OPEN",
    );

    let bestReqMatch: {
      reqId: string;
      urgency: Urgency;
      compat: CompatibilityResult;
    } | null = null;

    for (const req of candReqs) {
      const compat = getCompatibility(unit.component, unit.bloodGroup, req.bloodGroup);
      if (compat.level !== "INCOMPATIBLE") {
        // Prioritize CRITICAL > HIGH > NORMAL
        const urgencyWeight = { CRITICAL: 3, HIGH: 2, NORMAL: 1 }[req.urgency];
        const currentBestWeight = bestReqMatch
          ? { CRITICAL: 3, HIGH: 2, NORMAL: 1 }[bestReqMatch.urgency]
          : 0;

        if (!bestReqMatch || urgencyWeight > currentBestWeight) {
          bestReqMatch = {
            reqId: req.reqId,
            urgency: req.urgency,
            compat,
          };
        }
      }
    }

    // Find candidate's standing demand
    const candDemands = await queryAll<{
      component: Component;
      bloodGroup: BloodGroup;
      level: DemandLevel;
    }>({
      keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
      values: {
        ":pk": `FACILITY#${candidateId}`,
        ":skPrefix": `DEMAND#${unit.component}#`,
      },
    });

    let bestDemandMatch: {
      level: DemandLevel;
      compat: CompatibilityResult;
    } | null = null;

    for (const dem of candDemands) {
      const compat = getCompatibility(unit.component, unit.bloodGroup, dem.bloodGroup);
      if (compat.level !== "INCOMPATIBLE") {
        const levelWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 }[dem.level];
        const currentBestWeight = bestDemandMatch
          ? { HIGH: 3, MEDIUM: 2, LOW: 1 }[bestDemandMatch.level]
          : 0;

        if (!bestDemandMatch || levelWeight > currentBestWeight) {
          bestDemandMatch = {
            level: dem.level,
            compat,
          };
        }
      }
    }

    // Candidate must have a compatible need (requisition or demand)
    if (!bestReqMatch && !bestDemandMatch) {
      // Incompatible or no interest in this blood group/component
      continue;
    }

    // Determine final scoring inputs
    const compatibility = bestReqMatch?.compat ?? bestDemandMatch!.compat;
    const hasOpenRequisition = !!bestReqMatch;
    const urgency = bestReqMatch?.urgency ?? "NORMAL";
    const standingDemand = bestDemandMatch?.level ?? "LOW";

    const scoreResult = scoreOffer({
      compatibility,
      distanceKm: distItem.distanceKm,
      hasOpenRequisition,
      standingDemand,
      urgency,
      hoursRemaining,
      component: unit.component,
    });

    scoredCandidates.push({
      recipientFacilityId: candidateId,
      recipientFacilityName: candFacility.name,
      distanceKm: distItem.distanceKm,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
      reason: scoreResult.reason,
      requisitionId: bestReqMatch?.reqId,
    });
  }

  // 4. Sort descending by score, take top N
  scoredCandidates.sort((a, b) => b.score - a.score);
  const topCandidates = scoredCandidates.slice(0, cfg.offersPerRing);

  return {
    unitId: params.unitId,
    ring: params.ring,
    candidates: topCandidates,
  };
}

export async function handler(event: {
  unitId: string;
  ring?: 1 | 2 | 3;
  currentRing?: 1 | 2 | 3;
  escalationId?: string;
  offerWindow?: number;
  now?: string;
}) {
  const ring = event.ring ?? event.currentRing ?? 1;
  const result = await matchRing({
    unitId: event.unitId,
    ring,
    now: event.now,
  });

  return {
    ...event,
    unitId: result.unitId,
    ring: result.ring,
    currentRing: result.ring,
    candidates: result.candidates,
    candidatesCount: result.candidates.length,
  };
}
