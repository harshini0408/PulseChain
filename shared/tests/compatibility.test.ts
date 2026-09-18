/**
 * Table-driven tests for shared/src/compatibility.ts
 *
 * Each row: [component, donorGroup, recipientGroup, expectedLevel]
 * These are explicit assertions — a reviewer can cross-reference each cell
 * against a reference table in thirty seconds.
 */

import { describe, it, expect } from "vitest";
import { getCompatibility, isUsable } from "../src/compatibility.js";
import type { BloodGroup, CompatibilityLevel } from "../src/enums.js";

// ---------------------------------------------------------------------------
// Table-driven: RBC
// ---------------------------------------------------------------------------

describe("RBC compatibility", () => {
  const cases: [BloodGroup, BloodGroup, CompatibilityLevel][] = [
    // O- donor (universal RBC donor)
    ["O-", "O-",  "IDENTICAL"],
    ["O-", "O+",  "COMPATIBLE"],
    ["O-", "A-",  "COMPATIBLE"],
    ["O-", "A+",  "COMPATIBLE"],
    ["O-", "B-",  "COMPATIBLE"],
    ["O-", "B+",  "COMPATIBLE"],
    ["O-", "AB-", "COMPATIBLE"],
    ["O-", "AB+", "COMPATIBLE"],
    // O+ donor
    ["O+", "O+",  "IDENTICAL"],
    ["O+", "A+",  "COMPATIBLE"],
    ["O+", "B+",  "COMPATIBLE"],
    ["O+", "AB+", "COMPATIBLE"],
    ["O+", "O-",  "INCOMPATIBLE"],   // RhD+ → RhD- always incompatible for RBC
    ["O+", "A-",  "INCOMPATIBLE"],
    ["O+", "B-",  "INCOMPATIBLE"],
    ["O+", "AB-", "INCOMPATIBLE"],
    // A- donor
    ["A-", "A-",  "IDENTICAL"],
    ["A-", "A+",  "COMPATIBLE"],
    ["A-", "AB-", "COMPATIBLE"],
    ["A-", "AB+", "COMPATIBLE"],
    ["A-", "O-",  "INCOMPATIBLE"],
    ["A-", "B-",  "INCOMPATIBLE"],
    // A+ donor
    ["A+", "A+",  "IDENTICAL"],
    ["A+", "AB+", "COMPATIBLE"],
    ["A+", "A-",  "INCOMPATIBLE"],
    ["A+", "B+",  "INCOMPATIBLE"],
    ["A+", "O+",  "INCOMPATIBLE"],
    // B- donor
    ["B-", "B-",  "IDENTICAL"],
    ["B-", "B+",  "COMPATIBLE"],
    ["B-", "AB-", "COMPATIBLE"],
    ["B-", "AB+", "COMPATIBLE"],
    ["B-", "O-",  "INCOMPATIBLE"],
    ["B-", "A-",  "INCOMPATIBLE"],
    // B+ donor
    ["B+", "B+",  "IDENTICAL"],
    ["B+", "AB+", "COMPATIBLE"],
    ["B+", "B-",  "INCOMPATIBLE"],
    ["B+", "A+",  "INCOMPATIBLE"],
    // AB- donor (most restricted)
    ["AB-", "AB-", "IDENTICAL"],
    ["AB-", "AB+", "COMPATIBLE"],
    ["AB-", "A-",  "INCOMPATIBLE"],
    ["AB-", "B-",  "INCOMPATIBLE"],
    ["AB-", "O-",  "INCOMPATIBLE"],
    // AB+ donor (can only go to AB+)
    ["AB+", "AB+", "IDENTICAL"],
    ["AB+", "AB-", "INCOMPATIBLE"],
    ["AB+", "A+",  "INCOMPATIBLE"],
    ["AB+", "B+",  "INCOMPATIBLE"],
    ["AB+", "O+",  "INCOMPATIBLE"],
  ];

  it.each(cases)(
    "RBC: %s → %s = %s",
    (donor, recipient, expected) => {
      const result = getCompatibility("RBC", donor, recipient);
      expect(result.level).toBe(expected);
    },
  );

  it("no RBC result is ACCEPTABLE", () => {
    const groups: BloodGroup[] = ["O-","O+","A-","A+","B-","B+","AB-","AB+"];
    for (const d of groups) {
      for (const r of groups) {
        const result = getCompatibility("RBC", d, r);
        expect(result.level).not.toBe("ACCEPTABLE");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Table-driven: Plasma
// ---------------------------------------------------------------------------

describe("Plasma compatibility", () => {
  const cases: [BloodGroup, BloodGroup, CompatibilityLevel][] = [
    // AB plasma: universal donor
    ["AB-", "O-",  "COMPATIBLE"],
    ["AB-", "O+",  "COMPATIBLE"],
    ["AB-", "A-",  "COMPATIBLE"],
    ["AB-", "A+",  "COMPATIBLE"],
    ["AB-", "B-",  "COMPATIBLE"],
    ["AB-", "B+",  "COMPATIBLE"],
    ["AB-", "AB-", "IDENTICAL"],
    ["AB-", "AB+", "IDENTICAL"],  // ABO-identical (RhD differs, irrelevant for plasma)
    ["AB+", "AB+", "IDENTICAL"],
    ["AB+", "AB-", "IDENTICAL"],
    ["AB+", "O-",  "COMPATIBLE"],
    ["AB+", "A+",  "COMPATIBLE"],
    ["AB+", "B+",  "COMPATIBLE"],
    // A plasma
    ["A-", "A-",  "IDENTICAL"],
    ["A-", "A+",  "IDENTICAL"],   // ABO match, RhD irrelevant
    ["A-", "AB-", "COMPATIBLE"],
    ["A-", "AB+", "COMPATIBLE"],
    ["A-", "O-",  "INCOMPATIBLE"],
    ["A-", "B-",  "INCOMPATIBLE"],
    // B plasma
    ["B-", "B-",  "IDENTICAL"],
    ["B-", "B+",  "IDENTICAL"],
    ["B-", "AB+", "COMPATIBLE"],
    ["B-", "O-",  "INCOMPATIBLE"],
    ["B-", "A-",  "INCOMPATIBLE"],
    // O plasma: most restricted
    ["O-", "O-",  "IDENTICAL"],
    ["O-", "O+",  "IDENTICAL"],
    ["O-", "A-",  "INCOMPATIBLE"],
    ["O-", "B-",  "INCOMPATIBLE"],
    ["O-", "AB-", "INCOMPATIBLE"],
    ["O+", "O+",  "IDENTICAL"],
    ["O+", "O-",  "IDENTICAL"],
    ["O+", "A+",  "INCOMPATIBLE"],
  ];

  it.each(cases)(
    "Plasma: %s → %s = %s",
    (donor, recipient, expected) => {
      const result = getCompatibility("PLASMA", donor, recipient);
      expect(result.level).toBe(expected);
    },
  );

  it("RhD does not affect plasma level — both directions allowed", () => {
    // AB+ plasma → AB- recipient: IDENTICAL (ABO matches, RhD differs but irrelevant)
    expect(getCompatibility("PLASMA", "AB+", "AB-").level).toBe("IDENTICAL");
    // AB- plasma → AB+ recipient: IDENTICAL
    expect(getCompatibility("PLASMA", "AB-", "AB+").level).toBe("IDENTICAL");
  });
});

// ---------------------------------------------------------------------------
// Table-driven: Platelets
// ---------------------------------------------------------------------------

describe("Platelet compatibility", () => {
  const cases: [BloodGroup, BloodGroup, CompatibilityLevel][] = [
    // Identical
    ["O-",  "O-",  "IDENTICAL"],
    ["O+",  "O+",  "IDENTICAL"],
    ["A-",  "A-",  "IDENTICAL"],
    ["A+",  "A+",  "IDENTICAL"],
    ["B-",  "B-",  "IDENTICAL"],
    ["B+",  "B+",  "IDENTICAL"],
    ["AB-", "AB-", "IDENTICAL"],
    ["AB+", "AB+", "IDENTICAL"],
    // O- donor: COMPATIBLE into anything RhD-matched or RhD- → RhD+
    ["O-", "O+",  "COMPATIBLE"],    // RhD- into RhD+ = COMPATIBLE
    ["O-", "A-",  "COMPATIBLE"],
    ["O-", "A+",  "COMPATIBLE"],
    ["O-", "B-",  "COMPATIBLE"],
    ["O-", "B+",  "COMPATIBLE"],
    ["O-", "AB-", "COMPATIBLE"],
    ["O-", "AB+", "COMPATIBLE"],
    // O+ donor: RhD+ into RhD- = ACCEPTABLE
    ["O+", "O-",  "ACCEPTABLE"],
    ["O+", "A-",  "ACCEPTABLE"],
    ["O+", "B-",  "ACCEPTABLE"],
    ["O+", "AB-", "ACCEPTABLE"],
    // O+ into RhD+ = COMPATIBLE (ABO compatible, RhD matches)
    ["O+", "A+",  "COMPATIBLE"],
    ["O+", "B+",  "COMPATIBLE"],
    ["O+", "AB+", "COMPATIBLE"],
    // A donor
    ["A-", "AB-", "COMPATIBLE"],
    ["A-", "AB+", "COMPATIBLE"],
    ["A+", "AB+", "COMPATIBLE"],
    ["A+", "AB-", "ACCEPTABLE"],    // RhD+ into RhD- = ACCEPTABLE
    ["A-", "O-",  "INCOMPATIBLE"],
    ["A+", "B+",  "INCOMPATIBLE"],
    // B donor
    ["B-", "AB-", "COMPATIBLE"],
    ["B+", "AB+", "COMPATIBLE"],
    ["B+", "AB-", "ACCEPTABLE"],
    ["B-", "A-",  "INCOMPATIBLE"],
    // AB donor
    ["AB-", "AB+", "COMPATIBLE"],
    ["AB+", "AB-", "ACCEPTABLE"],
    ["AB-", "O-",  "INCOMPATIBLE"],
    ["AB-", "A-",  "INCOMPATIBLE"],
    ["AB-", "B-",  "INCOMPATIBLE"],
  ];

  it.each(cases)(
    "Platelets: %s → %s = %s",
    (donor, recipient, expected) => {
      const result = getCompatibility("PLATELETS", donor, recipient);
      expect(result.level).toBe(expected);
    },
  );

  it("every ACCEPTABLE result has rhdMismatch=true and mentions RhD in notes", () => {
    const groups: BloodGroup[] = ["O-","O+","A-","A+","B-","B+","AB-","AB+"];
    for (const d of groups) {
      for (const r of groups) {
        const result = getCompatibility("PLATELETS", d, r);
        if (result.level === "ACCEPTABLE") {
          expect(result.rhdMismatch).toBe(true);
          expect(result.notes.toLowerCase()).toMatch(/rhd/i);
        }
      }
    }
  });

  it("no INCOMPATIBLE pairing returns a non-INCOMPATIBLE level", () => {
    const incompatibles: [BloodGroup, BloodGroup][] = [
      ["A-", "O-"],
      ["B-", "A-"],
      ["AB-", "O-"],
      ["AB+", "A+"],
    ];
    for (const [d, r] of incompatibles) {
      expect(getCompatibility("PLATELETS", d, r).level).toBe("INCOMPATIBLE");
    }
  });
});

// ---------------------------------------------------------------------------
// isUsable helper
// ---------------------------------------------------------------------------

describe("isUsable", () => {
  it("IDENTICAL is usable", () => expect(isUsable("IDENTICAL")).toBe(true));
  it("COMPATIBLE is usable", () => expect(isUsable("COMPATIBLE")).toBe(true));
  it("ACCEPTABLE is usable", () => expect(isUsable("ACCEPTABLE")).toBe(true));
  it("INCOMPATIBLE is NOT usable", () => expect(isUsable("INCOMPATIBLE")).toBe(false));
});

// ---------------------------------------------------------------------------
// RhD four-permutation test (single ABO pairing: O donor, O recipient)
// ---------------------------------------------------------------------------

describe("RhD permutations for Platelets (O→O)", () => {
  it("O- donor → O- recipient: IDENTICAL", () => {
    expect(getCompatibility("PLATELETS", "O-", "O-").level).toBe("IDENTICAL");
  });
  it("O- donor → O+ recipient: COMPATIBLE (RhD- into RhD+)", () => {
    const r = getCompatibility("PLATELETS", "O-", "O+");
    expect(r.level).toBe("COMPATIBLE");
    expect(r.rhdMismatch).toBe(true);
  });
  it("O+ donor → O- recipient: ACCEPTABLE (RhD+ into RhD-)", () => {
    const r = getCompatibility("PLATELETS", "O+", "O-");
    expect(r.level).toBe("ACCEPTABLE");
    expect(r.rhdMismatch).toBe(true);
    expect(r.notes).toMatch(/rhd/i);
  });
  it("O+ donor → O+ recipient: IDENTICAL", () => {
    expect(getCompatibility("PLATELETS", "O+", "O+").level).toBe("IDENTICAL");
  });
});
