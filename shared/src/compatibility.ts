// ABO/Rh compatibility rules for RBC, plasma, and platelets.
//
// Rules implemented:
//   - PLATELETS:
//       IDENTICAL   = exact ABO+Rh match (e.g. O- donor → O- recipient)
//       COMPATIBLE  = compatible ABO (O can give to any, A to A/AB, B to B/AB, AB to AB), Rh- donor to Rh+ recipient is OK
//       ACCEPTABLE  = Rh+ donor to Rh- recipient with compatible ABO, or minor plasma mismatches
//       INCOMPATIBLE = ABO-incompatible (e.g. A → B, B → A)
//   - RBC: Strict ABO+Rh matching required. O- is universal donor, AB+ is universal recipient.
//   - PLASMA: Reverse ABO (AB is universal donor). Rh does not matter for plasma.
//   - isUsable: returns true for IDENTICAL, COMPATIBLE, ACCEPTABLE; false for INCOMPATIBLE.

import type { Component, BloodGroup, CompatibilityLevel } from "./enums.js";

interface BloodParts {
  abo: "O" | "A" | "B" | "AB";
  rh: "+" | "-";
}

function parseBloodGroup(group: BloodGroup): BloodParts {
  const rh = group.endsWith("+") ? "+" : "-";
  const abo = group.slice(0, -1) as "O" | "A" | "B" | "AB";
  return { abo, rh };
}

function isRbcAboCompatible(donorAbo: string, recipientAbo: string): boolean {
  if (donorAbo === "O") return true;
  if (donorAbo === "A") return recipientAbo === "A" || recipientAbo === "AB";
  if (donorAbo === "B") return recipientAbo === "B" || recipientAbo === "AB";
  if (donorAbo === "AB") return recipientAbo === "AB";
  return false;
}

function isPlasmaAboCompatible(donorAbo: string, recipientAbo: string): boolean {
  if (donorAbo === "AB") return true;
  if (donorAbo === "A") return recipientAbo === "A" || recipientAbo === "O";
  if (donorAbo === "B") return recipientAbo === "B" || recipientAbo === "O";
  if (donorAbo === "O") return recipientAbo === "O";
  return false;
}

export function compatibilityLevel(
  component: Component,
  donor: BloodGroup,
  recipient: BloodGroup,
): CompatibilityLevel {
  if (donor === recipient) {
    return "IDENTICAL";
  }

  const d = parseBloodGroup(donor);
  const r = parseBloodGroup(recipient);

  if (component === "RBC") {
    const aboOk = isRbcAboCompatible(d.abo, r.abo);
    const rhOk = d.rh === "-" || (d.rh === "+" && r.rh === "+");
    if (aboOk && rhOk) {
      return "COMPATIBLE";
    }
    return "INCOMPATIBLE";
  }

  if (component === "PLASMA") {
    // Rh does not matter for plasma
    const aboOk = isPlasmaAboCompatible(d.abo, r.abo);
    if (aboOk) {
      return "COMPATIBLE";
    }
    return "INCOMPATIBLE";
  }

  if (component === "PLATELETS") {
    const aboOk = isRbcAboCompatible(d.abo, r.abo);
    if (!aboOk) {
      return "INCOMPATIBLE";
    }
    // ABO is compatible:
    // Rh- to Rh+ or Rh- to Rh- or Rh+ to Rh+ -> COMPATIBLE
    if (d.rh === "-" || (d.rh === "+" && r.rh === "+")) {
      return "COMPATIBLE";
    }
    // Rh+ to Rh- is ACCEPTABLE for platelets
    return "ACCEPTABLE";
  }

  return "INCOMPATIBLE";
}

export function isUsable(level: CompatibilityLevel): boolean {
  return level === "IDENTICAL" || level === "COMPATIBLE" || level === "ACCEPTABLE";
}
