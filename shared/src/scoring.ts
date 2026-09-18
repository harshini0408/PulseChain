/**
 * Deterministic offer scoring for PulseChain.
 *
 * Each offer is scored against five weighted factors defined in config.ts.
 * The weights must sum to exactly 1.0 — a runtime assertion enforces this at
 * module load so a misconfigured config.ts fails loudly rather than silently
 * producing wrong rankings.
 *
 * This module has zero AWS SDK dependencies and is safe to import in the browser.
 */

import type { Component, DemandLevel, Urgency } from "./enums.js";
import { getConfig } from "./config.js";
import type { CompatibilityResult } from "./compatibility.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScoreInput {
  compatibility: CompatibilityResult;
  distanceKm: number;
  /** Recipient has a matching open requisition for this component + compatible group */
  hasOpenRequisition: boolean;
  standingDemand: DemandLevel;
  /** Urgency from the requisition, or NORMAL if none */
  urgency: Urgency;
  /** Unit hours to expiry at scoring time */
  hoursRemaining: number;
  component: Component;
}

export interface ScoreResult {
  /** 0..1, rounded to 3 decimal places */
  score: number;
  breakdown: {
    compatibility: number;
    /** Raw kilometres — stored in Offer.breakdown.distanceKm for the UI */
    distanceKm: number;
    distanceScore: number;
    openRequisition: number;
    standingDemand: number;
    urgency: number;
    /** Raw hours — stored in Offer.breakdown.hoursRemaining for the UI */
    hoursRemaining: number;
  };
  reason: string;
}

// ---------------------------------------------------------------------------
// Weight-sum assertion — fires at module load
// ---------------------------------------------------------------------------

const _cfg = getConfig();
const _wSum =
  _cfg.scoreWeights.compatibility +
  _cfg.scoreWeights.distance +
  _cfg.scoreWeights.openRequisition +
  _cfg.scoreWeights.standingDemand +
  _cfg.scoreWeights.urgency;

if (Math.abs(_wSum - 1.0) > 1e-9) {
  throw new Error(
    `[scoring] scoreWeights in config.ts must sum to 1.0, got ${_wSum.toFixed(6)}`,
  );
}

// ---------------------------------------------------------------------------
// Factor sub-score helpers
// ---------------------------------------------------------------------------

function compatibilitySubScore(level: string): number {
  switch (level) {
    case "IDENTICAL":
      return 1.0;
    case "COMPATIBLE":
      return 0.7;
    case "ACCEPTABLE":
      return 0.3;
    default:
      return 0; // should never reach here — throw below guards this
  }
}

export function distanceSubScore(distanceKm: number): number {
  const ringOuterKm = getConfig().rings[1].maxKm; // 30 km — Ring 2 outer limit
  const raw = 1 - distanceKm / ringOuterKm;
  return Math.min(1, Math.max(0, raw));
}


function openRequisitionSubScore(has: boolean): number {
  return has ? 1.0 : 0.0;
}

function standingDemandSubScore(level: DemandLevel): number {
  switch (level) {
    case "LOW":
      return 0.2;
    case "MEDIUM":
      return 0.6;
    case "HIGH":
      return 1.0;
  }
}

function statedUrgencyScore(urgency: Urgency): number {
  switch (urgency) {
    case "NORMAL":
      return 0.2;
    case "HIGH":
      return 0.6;
    case "CRITICAL":
      return 1.0;
  }
}

function urgencySubScore(
  urgency: Urgency,
  hoursRemaining: number,
  component: Component,
): number {
  const thresholdHours = getConfig().thresholdHours[component];
  const clockUrgency = Math.min(
    1,
    Math.max(0, 1 - hoursRemaining / thresholdHours),
  );
  const stated = statedUrgencyScore(urgency);
  // Use max: either reason alone justifies urgency.
  return Math.max(stated, clockUrgency);
}

// ---------------------------------------------------------------------------
// Reason string builder
// ---------------------------------------------------------------------------

function buildReason(input: ScoreInput, scores: Record<string, number>): string {
  const { compatibility, distanceKm, hasOpenRequisition, standingDemand, hoursRemaining, component } = input;
  const parts: string[] = [];

  // Compatibility
  if (compatibility.level === "IDENTICAL") {
    parts.push("IDENTICAL match");
  } else if (compatibility.level === "COMPATIBLE") {
    if (compatibility.rhdMismatch) {
      parts.push("Compatible (RhD- unit into RhD+)");
    } else {
      parts.push("Compatible match");
    }
  } else if (compatibility.level === "ACCEPTABLE") {
    // RhD caveat MUST appear in the reason for ACCEPTABLE — prompt requirement
    parts.push("ABO-compatible; RhD+ unit into RhD- recipient");
  }

  // Distance
  parts.push(`${distanceKm.toFixed(1)} km away`);

  // Open requisition
  if (hasOpenRequisition) {
    parts.push("open requisition for this component");
  } else {
    parts.push("no open requisition");
  }

  // Standing demand (only if HIGH — avoid noise for LOW/MEDIUM)
  if (standingDemand === "HIGH") {
    parts.push("high standing demand");
  } else if (standingDemand === "MEDIUM") {
    parts.push("medium standing demand");
  }

  // Expiry urgency — highlight only when unit is close to threshold
  const thresholdHours = getConfig().thresholdHours[component];
  if (hoursRemaining <= thresholdHours * 0.25) {
    parts.push(`${Math.round(hoursRemaining)} hours to expiry`);
  }

  return parts.join(", ").slice(0, 140);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score a potential blood unit offer.
 *
 * Throws if the compatibility level is INCOMPATIBLE — filtering must exclude
 * those candidates upstream.
 */
export function scoreOffer(input: ScoreInput): ScoreResult {
  if (input.compatibility.level === "INCOMPATIBLE") {
    throw new Error(
      `[scoring] scoreOffer called with INCOMPATIBLE compatibility for component ` +
        `${input.component}. Filter out incompatible candidates before scoring.`,
    );
  }

  const cfg = getConfig();
  const w = cfg.scoreWeights;

  const compatScore = compatibilitySubScore(input.compatibility.level);
  const distScore = distanceSubScore(input.distanceKm);
  const openReqScore = openRequisitionSubScore(input.hasOpenRequisition);
  const demandScore = standingDemandSubScore(input.standingDemand);
  const urgScore = urgencySubScore(input.urgency, input.hoursRemaining, input.component);

  const weightedSum =
    w.compatibility * compatScore +
    w.distance * distScore +
    w.openRequisition * openReqScore +
    w.standingDemand * demandScore +
    w.urgency * urgScore;

  const score = Math.round(weightedSum * 1000) / 1000;

  const breakdown = {
    compatibility: compatScore,
    distanceKm: input.distanceKm,        // raw km — stored in Offer.breakdown for the UI
    distanceScore: distScore,
    openRequisition: openReqScore,
    standingDemand: demandScore,
    urgency: urgScore,
    hoursRemaining: input.hoursRemaining, // raw hours — stored in Offer.breakdown for the UI
  };

  const reason = buildReason(input, { compatScore, distScore, openReqScore, demandScore, urgScore });

  return { score, breakdown, reason };
}
