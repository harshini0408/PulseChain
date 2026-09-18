/**
 * ABO/RhD compatibility tables for PulseChain.
 *
 * IMPORTANT — scope and liability
 * ================================
 * These tables encode *routine* transfusion compatibility only, as practised
 * in standard Indian blood-banking protocols.  PulseChain is a coordination
 * layer that surfaces redistribution opportunities; it does NOT replace the
 * licensed transfusion officer's release decision.  Every offer produced by
 * this system must be independently verified by the receiving centre before
 * any unit is issued to a patient.
 *
 * Table sources
 * =============
 * RBC   — AABB Technical Manual (19th ed.) Table 23-1; NBTC India guidelines.
 * Plasma — Reverse-ABO rule: donor ABO must be compatible with recipient's
 *           red cells (i.e., AB plasma → any; O plasma → O only).
 * Platelets — British Committee for Standards in Haematology (BCSH) 2017
 *             platelet compatibility guidelines; ABO-identical preferred,
 *             ABO-compatible acceptable, RhD-positive into RhD-negative
 *             classified ACCEPTABLE (not INCOMPATIBLE) for platelets per
 *             BCSH guidance (minor RhD sensitisation risk, managed clinically).
 *
 * If any cell is uncertain, it is marked // REVIEW: rather than guessed.
 */

import type { Component, BloodGroup, CompatibilityLevel } from "./enums.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CompatibilityResult {
  level: CompatibilityLevel;
  /** true when RhD differs in either direction */
  rhdMismatch: boolean;
  /** Short human-readable justification, shown verbatim in the UI */
  notes: string;
}

// ---------------------------------------------------------------------------
// Internal helpers — split blood group string into ABO and RhD
// ---------------------------------------------------------------------------

type ABO = "O" | "A" | "B" | "AB";
type RhD = "+" | "-";

function parseGroup(g: BloodGroup): { abo: ABO; rhd: RhD } {
  if (g.startsWith("AB")) return { abo: "AB", rhd: g[2] as RhD };
  return { abo: g[0] as ABO, rhd: g[1] as RhD };
}

// ---------------------------------------------------------------------------
// RBC compatibility table
// donorABO → list of recipient ABO groups that can safely receive that unit
// (RhD handled separately: RhD+ donor → RhD- recipient is INCOMPATIBLE for RBC)
// ---------------------------------------------------------------------------

const RBC_COMPATIBLE: Record<ABO, ABO[]> = {
  O:  ["O", "A", "B", "AB"],   // O is the universal RBC donor
  A:  ["A", "AB"],
  B:  ["B", "AB"],
  AB: ["AB"],                   // AB is the most restricted RBC donor
};

// ---------------------------------------------------------------------------
// Plasma compatibility table
// Plasma ABO runs in the REVERSE direction to RBC.
// donorABO → list of recipient ABO groups that can safely receive that plasma
// AB plasma is universal donor; O plasma is universal recipient only.
// RhD is irrelevant for plasma.
// ---------------------------------------------------------------------------

const PLASMA_COMPATIBLE: Record<ABO, ABO[]> = {
  AB: ["O", "A", "B", "AB"],  // AB plasma: universal donor
  A:  ["A", "AB"],            // A plasma → A or AB recipients
  B:  ["B", "AB"],            // B plasma → B or AB recipients
  O:  ["O"],                  // O plasma: most restricted donor
};

// ---------------------------------------------------------------------------
// Platelet ABO compatibility table (less strict than RBC)
// BCSH 2017: ABO-matched preferred; ABO-compatible acceptable.
// The platelet-specific table mirrors RBC ABO compatibility for routine
// redistribution — major ABO mismatch (e.g. A into B) is incompatible.
// RhD mismatch (RhD+ unit → RhD- recipient) is ACCEPTABLE, not INCOMPATIBLE.
// ---------------------------------------------------------------------------

const PLATELET_COMPATIBLE: Record<ABO, ABO[]> = {
  O:  ["O", "A", "B", "AB"],  // O platelets: ABO-compatible into any ABO
  A:  ["A", "AB"],
  B:  ["B", "AB"],
  AB: ["AB"],
  // REVIEW: Some centres allow minor ABO-incompatible platelet transfusions
  // (e.g. O into A) clinically — marked INCOMPATIBLE here per conservative policy.
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the compatibility level of a blood unit for a given donor → recipient
 * blood group pair and component type.
 *
 * @param component  PLATELETS | RBC | PLASMA
 * @param donorGroup  e.g. "O-", "AB+"
 * @param recipientGroup  e.g. "A+", "B-"
 */
export function getCompatibility(
  component: Component,
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
): CompatibilityResult {
  const donor = parseGroup(donorGroup);
  const recipient = parseGroup(recipientGroup);
  const rhdMismatch = donor.rhd !== recipient.rhd;
  const exactMatch = donorGroup === recipientGroup;

  switch (component) {
    case "RBC":
      return rbcCompatibility(donor, recipient, rhdMismatch, exactMatch);
    case "PLASMA":
      return plasmaCompatibility(donor, recipient, rhdMismatch, exactMatch);
    case "PLATELETS":
      return plateletCompatibility(donor, recipient, rhdMismatch, exactMatch);
  }
}

/**
 * Returns true for IDENTICAL, COMPATIBLE, or ACCEPTABLE — i.e., any level
 * that is eligible for redistribution.  INCOMPATIBLE is always false.
 */
export function isUsable(level: CompatibilityLevel): boolean {
  return level !== "INCOMPATIBLE";
}

// ---------------------------------------------------------------------------
// Component-specific logic
// ---------------------------------------------------------------------------

function rbcCompatibility(
  donor: { abo: ABO; rhd: RhD },
  recipient: { abo: ABO; rhd: RhD },
  rhdMismatch: boolean,
  exactMatch: boolean,
): CompatibilityResult {
  // RhD-positive unit into RhD-negative recipient: INCOMPATIBLE for RBC
  if (donor.rhd === "+" && recipient.rhd === "-") {
    return {
      level: "INCOMPATIBLE",
      rhdMismatch: true,
      notes: "RhD+ unit cannot be issued to an RhD- recipient for RBC transfusion",
    };
  }

  const aboOk = RBC_COMPATIBLE[donor.abo].includes(recipient.abo);
  if (!aboOk) {
    return {
      level: "INCOMPATIBLE",
      rhdMismatch,
      notes: `ABO-incompatible: ${donor.abo} donor RBC is not compatible with ${recipient.abo} recipient`,
    };
  }

  if (exactMatch) {
    return {
      level: "IDENTICAL",
      rhdMismatch: false,
      notes: "Exact ABO and RhD match",
    };
  }

  // ABO compatible, RhD- unit into RhD+ recipient (the only remaining case after the
  // RhD+ → RhD- check above)
  return {
    level: "COMPATIBLE",
    rhdMismatch,
    notes: rhdMismatch
      ? `ABO-compatible; RhD- unit into RhD+ recipient (safe for RBC)`
      : `ABO-compatible match`,
  };
}

function plasmaCompatibility(
  donor: { abo: ABO; rhd: RhD },
  recipient: { abo: ABO; rhd: RhD },
  rhdMismatch: boolean,
  exactMatch: boolean,
): CompatibilityResult {
  // RhD is irrelevant for plasma
  const aboOk = PLASMA_COMPATIBLE[donor.abo].includes(recipient.abo);
  if (!aboOk) {
    return {
      level: "INCOMPATIBLE",
      rhdMismatch,
      notes: `ABO-incompatible for plasma: ${donor.abo} donor plasma cannot go to ${recipient.abo} recipient`,
    };
  }

  // For plasma, ABO-identical means the ABO groups match (RhD irrelevant)
  if (donor.abo === recipient.abo) {
    return {
      level: "IDENTICAL",
      rhdMismatch,
      notes:
        rhdMismatch
          ? "Identical ABO; RhD differs but is not clinically relevant for plasma"
          : "Exact ABO and RhD match",
    };
  }

  return {
    level: "COMPATIBLE",
    rhdMismatch,
    notes: `ABO-compatible plasma (${donor.abo} → ${recipient.abo}); RhD not a constraint for plasma`,
  };
}

function plateletCompatibility(
  donor: { abo: ABO; rhd: RhD },
  recipient: { abo: ABO; rhd: RhD },
  rhdMismatch: boolean,
  exactMatch: boolean,
): CompatibilityResult {
  const aboOk = PLATELET_COMPATIBLE[donor.abo].includes(recipient.abo);
  if (!aboOk) {
    return {
      level: "INCOMPATIBLE",
      rhdMismatch,
      notes: `ABO-incompatible for platelets: ${donor.abo} donor is not compatible with ${recipient.abo} recipient`,
    };
  }

  // Exact ABO+RhD match → IDENTICAL
  if (exactMatch) {
    return {
      level: "IDENTICAL",
      rhdMismatch: false,
      notes: "Exact ABO and RhD match",
    };
  }

  // ABO-compatible, RhD+ unit into RhD- recipient → ACCEPTABLE (BCSH 2017)
  if (donor.rhd === "+" && recipient.rhd === "-") {
    return {
      level: "ACCEPTABLE",
      rhdMismatch: true,
      notes:
        "ABO-compatible; RhD+ unit into RhD- recipient — confirm with the transfusion officer",
    };
  }

  // ABO-compatible, RhD- unit into RhD+ recipient (or same RhD) → COMPATIBLE
  return {
    level: "COMPATIBLE",
    rhdMismatch,
    notes:
      rhdMismatch
        ? `ABO-compatible; RhD- unit into RhD+ recipient (no sensitisation risk)`
        : `ABO-compatible match; RhD matches`,
  };
}
