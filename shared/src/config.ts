// Thresholds, offer windows, ring radii, score weights; DEMO vs PROD mode.
// All magic numbers live here. Never use literals elsewhere.

import type { Component } from "./enums.js";

export type Mode = "DEMO" | "PROD";

export interface RingConfig {
  ring: 1 | 2 | 3;
  minKm: number;
  maxKm: number;
}

export interface Config {
  mode: Mode;
  /** Hours before expiry at which a unit enters RESCUE_PENDING */
  thresholdHours: Record<Component, number>;
  /** Full shelf life in days per component */
  shelfLifeDays: Record<Component, number>;
  rings: RingConfig[];
  /** Seconds a hospital has to claim an offer before it expires */
  offerWindowSeconds: number;
  /** Step Functions wait between rings */
  ringWaitSeconds: number;
  /** Max offers created per ring per escalation */
  offersPerRing: number;
  /** EventBridge Scheduler cadence */
  sweepIntervalMinutes: number;
  /** Default unit value for impact dashboard */
  valuePerUnitInr: number;
  scoreWeights: {
    compatibility: number;
    distance: number;
    openRequisition: number;
    standingDemand: number;
    urgency: number;
  };
}

/** Resolve mode from environment, safely for both Node and browser contexts. */
function resolveMode(override?: Mode): Mode {
  if (override) return override;
  try {
    if (typeof process !== "undefined" && process.env) {
      return process.env.DEMO_MODE === "false" ? "PROD" : "DEMO";
    }
  } catch {
    // browser: no process
  }
  return "DEMO";
}

export function getConfig(mode?: Mode): Config {
  const resolved = resolveMode(mode);

  return {
    mode: resolved,
    thresholdHours: {
      PLATELETS: 48,
      RBC: 168,   // 7 days
      PLASMA: 720, // 30 days
    },
    shelfLifeDays: {
      PLATELETS: 5,
      RBC: 35,
      PLASMA: 365,
    },
    rings: [
      { ring: 1, minKm: 0,  maxKm: 10 },
      { ring: 2, minKm: 10, maxKm: 30 },
      { ring: 3, minKm: 30, maxKm: 999.9 },
    ],
    offerWindowSeconds: resolved === "DEMO" ? 90 : 7200,
    ringWaitSeconds:    resolved === "DEMO" ? 90 : 7200,
    offersPerRing: 3,
    sweepIntervalMinutes: 5,
    valuePerUnitInr: 1500,
    scoreWeights: {
      compatibility:    0.25,
      distance:         0.25,
      openRequisition:  0.25,
      standingDemand:   0.15,
      urgency:          0.10,
    },
  };
}
