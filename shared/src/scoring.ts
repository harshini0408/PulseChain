// Deterministic candidate ranking + per-factor breakdown + reason text.
// Signatures only — implementation requires compatibility.ts to be done first.
//
// TODO: Implement rankCandidates with the following factor weights from config.ts:
//   compatibility   0.25  — use CompatibilityLevel ordinal (IDENTICAL=1, COMPATIBLE=0.75,
//                           ACCEPTABLE=0.5, INCOMPATIBLE=0 → excluded via isUsable)
//   distance        0.25  — inversely proportional to distanceKm within the active ring
//   openRequisition 0.25  — 1.0 if candidate has an open requisition for this component+group
//   standingDemand  0.15  — proportional to demand.weeklyUnits (capped at max observed)
//   urgency         0.10  — CRITICAL=1, HIGH=0.6, NORMAL=0.2 (from candidate's requisition)
//   hoursRemaining         — not a score factor; included in breakdown for UI display only
//
// Candidates with INCOMPATIBLE blood must be excluded before ranking.
// Ties broken by lower distanceKm, then lexicographic facilityId.
// reason must be a human-readable English sentence summarising the top 2 factors.

import type { BloodUnit, Facility, StandingDemand, Requisition, MatchBreakdown } from "./types.js";

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

export function rankCandidates(
  unit: BloodUnit,
  candidates: Candidate[],
  now?: Date,
): RankedCandidate[] {
  throw new Error("TODO: implement rankCandidates");
}
