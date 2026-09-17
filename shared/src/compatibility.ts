// ABO/Rh compatibility rules for RBC, plasma, and platelets.
// Signatures only — implementation requires medical review and will be done in a later session.
//
// TODO: Implement the following rules (verified with a haematologist before merging):
//   - PLATELETS: ABO compatibility is less strict than RBC.
//       IDENTICAL   = exact ABO+Rh match (e.g. O- donor → O- recipient)
//       COMPATIBLE  = compatible ABO (e.g. O can give to any), Rh- donor to Rh+ recipient is OK
//       ACCEPTABLE  = minor ABO mismatch still clinically acceptable for platelets
//       INCOMPATIBLE = ABO-incompatible (e.g. A → B)
//   - RBC: Strict ABO+Rh matching required. O- is universal donor, AB+ is universal recipient.
//   - PLASMA: Reverse ABO (AB is universal donor). Rh does not matter for plasma.
//   - isUsable: returns true for IDENTICAL, COMPATIBLE, ACCEPTABLE; false for INCOMPATIBLE.

import type { Component, BloodGroup, CompatibilityLevel } from "./enums.js";

export function compatibilityLevel(
  component: Component,
  donor: BloodGroup,
  recipient: BloodGroup,
): CompatibilityLevel {
  throw new Error("TODO: implement ABO/Rh compatibility — requires medical review");
}

export function isUsable(level: CompatibilityLevel): boolean {
  throw new Error("TODO: implement isUsable");
}
