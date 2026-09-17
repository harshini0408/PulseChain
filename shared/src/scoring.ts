// Deterministic candidate ranking + per-factor breakdown + reason text.

import type { BloodUnit, Facility, StandingDemand, Requisition, MatchBreakdown } from "./types.js";
import { compatibilityLevel, isUsable } from "./compatibility.js";
import { hoursRemaining } from "./time.js";
import { getConfig } from "./config.js";
import type { CompatibilityLevel, Urgency } from "./enums.js";

export interface Candidate {
  facility: Facility;
  distanceKm: number;
  demand?: StandingDemand;
  requisition?: Requisition;
}

export interface RankedCandidate extends Candidate {
  score: number;
  rank: number;
  breakdown: MatchBreakdown;
  reason: string;
}

const COMPAT_SCORES: Record<CompatibilityLevel, number> = {
  IDENTICAL: 1.0,
  COMPATIBLE: 0.75,
  ACCEPTABLE: 0.5,
  INCOMPATIBLE: 0.0,
};

const URGENCY_SCORES: Record<Urgency, number> = {
  CRITICAL: 1.0,
  HIGH: 0.6,
  NORMAL: 0.2,
};

function generateReason(breakdown: MatchBreakdown, compatLevel: CompatibilityLevel, req?: Requisition): string {
  const parts: string[] = [];

  if (compatLevel === "IDENTICAL") {
    parts.push("exact blood group match");
  } else if (compatLevel === "COMPATIBLE") {
    parts.push("compatible blood group");
  }

  if (req) {
    if (req.urgency === "CRITICAL") {
      parts.push("critical active requisition");
    } else if (req.urgency === "HIGH") {
      parts.push("high-urgency active requisition");
    } else {
      parts.push("open matching requisition");
    }
  }

  if (breakdown.distanceKm <= 10) {
    parts.push(`close proximity (${breakdown.distanceKm.toFixed(1)} km)`);
  } else {
    parts.push(`within response radius (${breakdown.distanceKm.toFixed(1)} km)`);
  }

  if (breakdown.standingDemand > 0.5) {
    parts.push("high standing weekly demand");
  }

  const topTwo = parts.slice(0, 2).join(" and ");
  return `Ranked for ${topTwo || "regional network compatibility"}.`;
}

export function rankCandidates(
  unit: BloodUnit,
  candidates: Candidate[],
  now?: Date,
): RankedCandidate[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const config = getConfig();
  const weights = config.scoreWeights;
  const currentHoursRemaining = hoursRemaining(unit.expiresAt, now ?? new Date());

  // 1. Filter out incompatible candidates
  const compatibleCandidates: Array<{
    candidate: Candidate;
    compatLevel: CompatibilityLevel;
  }> = [];

  for (const c of candidates) {
    const targetGroup = c.requisition?.bloodGroup ?? c.demand?.bloodGroup ?? unit.bloodGroup;
    const level = compatibilityLevel(unit.component, unit.bloodGroup, targetGroup);
    if (isUsable(level)) {
      compatibleCandidates.push({ candidate: c, compatLevel: level });
    }
  }

  if (compatibleCandidates.length === 0) {
    return [];
  }

  // 2. Find max distance and max weekly units for normalization
  const maxDistance = Math.max(...compatibleCandidates.map((c) => c.candidate.distanceKm), 1);
  const maxWeeklyUnits = Math.max(
    ...compatibleCandidates.map((c) => c.candidate.demand?.weeklyUnits ?? 0),
    1
  );

  // 3. Compute factor scores
  const scored = compatibleCandidates.map(({ candidate, compatLevel }) => {
    const compatScore = COMPAT_SCORES[compatLevel] ?? 0;
    
    // Distance score: closer is higher (1.0 at 0km, down towards 0 at max observed distance or 50km baseline)
    const distFactor = Math.max(0, 1 - candidate.distanceKm / Math.max(maxDistance, 50));
    
    // Open requisition score
    const hasOpenReq = candidate.requisition && candidate.requisition.status === "OPEN" ? 1.0 : 0.0;
    
    // Standing demand score
    const demandUnits = candidate.demand?.weeklyUnits ?? 0;
    const demandScore = maxWeeklyUnits > 0 ? demandUnits / maxWeeklyUnits : 0;
    
    // Urgency score
    const urgency = candidate.requisition?.urgency ?? (candidate.demand ? "NORMAL" : "NORMAL");
    const urgencyScore = candidate.requisition ? (URGENCY_SCORES[urgency] ?? 0.2) : (candidate.demand ? 0.2 : 0);

    const totalScore =
      compatScore * weights.compatibility +
      distFactor * weights.distance +
      hasOpenReq * weights.openRequisition +
      demandScore * weights.standingDemand +
      urgencyScore * weights.urgency;

    const breakdown: MatchBreakdown = {
      compatibility: compatScore,
      distanceKm: candidate.distanceKm,
      openRequisition: hasOpenReq,
      standingDemand: demandScore,
      urgency: urgencyScore,
      hoursRemaining: currentHoursRemaining,
    };

    const reason = generateReason(breakdown, compatLevel, candidate.requisition);

    return {
      ...candidate,
      score: Number(totalScore.toFixed(4)),
      breakdown,
      reason,
    };
  });

  // 4. Sort: score descending, tie-breaker: distance ascending, then facilityId ascending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    return a.facility.facilityId.localeCompare(b.facility.facilityId);
  });

  // 5. Assign 1-indexed ranks
  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}
