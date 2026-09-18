/**
 * Tests for shared/src/scoring.ts
 *
 * Hand-computed expected scores use config.ts weights:
 *   compatibility .25 | distance .25 | openRequisition .25 | standingDemand .15 | urgency .10
 *
 * If weights change in config.ts, these assertions will break loudly — that is intentional.
 */

import { describe, it, expect } from "vitest";
import { scoreOffer, distanceSubScore } from "../src/scoring.js";
import type { ScoreInput } from "../src/scoring.js";
import { getCompatibility } from "../src/compatibility.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    compatibility: getCompatibility("PLATELETS", "O-", "O-"), // IDENTICAL
    distanceKm: 5,
    hasOpenRequisition: true,
    standingDemand: "HIGH",
    urgency: "NORMAL",
    hoursRemaining: 36,
    component: "PLATELETS",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Distance sub-score boundary tests
// Ring outer = 30 km.  distanceScore = clamp(1 - distanceKm / 30, 0, 1)
// ---------------------------------------------------------------------------

describe("Distance sub-score boundaries", () => {
  const isolatedCases: [number, number][] = [
    [0, 1.000],
    [7.5, 0.750],
    [10.0, 0.667],
    [15.0, 0.500],
    [29.9, 0.003],
    [30.0, 0.000],
    [45.0, 0.000],
  ];

  it.each(isolatedCases)(
    "isolated distanceSubScore at %s km equals %s",
    (km, expectedScore) => {
      expect(distanceSubScore(km)).toBeCloseTo(expectedScore, 3);
    },
  );

  it("result.breakdown.distanceScore matches isolated distanceSubScore", () => {
    for (const [km, expectedScore] of isolatedCases) {
      const result = scoreOffer(makeInput({ distanceKm: km }));
      expect(result.breakdown.distanceScore).toBeCloseTo(expectedScore, 3);
    }
  });

  it("10.0 km produces distanceScore ≈ 0.667 (Ring 1 boundary)", () => {
    const score = distanceSubScore(10.0);
    expect(score).toBeCloseTo(1 - 10 / 30, 3);
  });
});

// ---------------------------------------------------------------------------
// INCOMPATIBLE throws
// ---------------------------------------------------------------------------

describe("Incompatible input", () => {
  it("throws a descriptive error for INCOMPATIBLE compatibility", () => {
    const incompatible = getCompatibility("RBC", "AB+", "O-"); // definitely INCOMPATIBLE
    expect(incompatible.level).toBe("INCOMPATIBLE");

    expect(() =>
      scoreOffer(makeInput({ compatibility: incompatible, component: "RBC" })),
    ).toThrowError(/INCOMPATIBLE/);
  });
});

// ---------------------------------------------------------------------------
// Full end-to-end cases (hand-computed)
// Weights: compat=.25, dist=.25, openReq=.25, demand=.15, urgency=.10
// ---------------------------------------------------------------------------

describe("Full end-to-end scoring — PLATELETS", () => {
  /**
   * compatibility = IDENTICAL → 1.0
   * distanceKm   = 5         → 1 - 5/30 ≈ 0.83333
   * openReq      = true      → 1.0
   * demand       = HIGH      → 1.0
   * urgency: NORMAL, 36 h, threshold 48 h
   *   statedUrgency=0.2, clockUrgency=1-36/48=0.25 → max=0.25
   *
   * score = .25*1.0 + .25*0.83333 + .25*1.0 + .15*1.0 + .10*0.25
   *       = 0.25 + 0.20833 + 0.25 + 0.15 + 0.025 = 0.88333 → 0.883
   */
  it("IDENTICAL, 5 km, open req, HIGH demand, NORMAL+36h → score ≈ 0.883", () => {
    const result = scoreOffer(makeInput({
      distanceKm: 5,
      hasOpenRequisition: true,
      standingDemand: "HIGH",
      urgency: "NORMAL",
      hoursRemaining: 36,
      component: "PLATELETS",
    }));
    expect(result.score).toBeCloseTo(0.883, 2);
  });
});

describe("Full end-to-end scoring — RBC", () => {
  /**
   * compatibility = COMPATIBLE → 0.7
   * distanceKm   = 20         → 1 - 20/30 ≈ 0.33333
   * openReq      = false      → 0.0
   * demand       = MEDIUM     → 0.6
   * urgency: HIGH, 100 h, threshold 168 h
   *   statedUrgency=0.6, clockUrgency=1-100/168≈0.4048 → max=0.6
   *
   * score = .25*0.7 + .25*0.33333 + .25*0.0 + .15*0.6 + .10*0.6
   *       = 0.175 + 0.08333 + 0.0 + 0.09 + 0.06 = 0.40833 → 0.408
   */
  it("COMPATIBLE, 20 km, no req, MEDIUM demand, HIGH+100h RBC → score ≈ 0.408", () => {
    const result = scoreOffer({
      compatibility: getCompatibility("RBC", "O-", "A+"),   // COMPATIBLE
      distanceKm: 20,
      hasOpenRequisition: false,
      standingDemand: "MEDIUM",
      urgency: "HIGH",
      hoursRemaining: 100,
      component: "RBC",
    });
    expect(result.score).toBeCloseTo(0.408, 2);
  });
});

describe("Full end-to-end scoring — PLASMA", () => {
  /**
   * compatibility = COMPATIBLE (AB- plasma → O-) → 0.7
   * distanceKm   = 0   → 1.0
   * openReq      = true → 1.0
   * demand       = LOW  → 0.2
   * urgency: CRITICAL, 500 h, threshold 720 h
   *   statedUrgency=1.0, clockUrgency=1-500/720≈0.3056 → max=1.0
   *
   * score = .25*0.7 + .25*1.0 + .25*1.0 + .15*0.2 + .10*1.0
   *       = 0.175 + 0.25 + 0.25 + 0.03 + 0.10 = 0.805
   */
  it("COMPATIBLE, 0 km, open req, LOW demand, CRITICAL+500h PLASMA → score ≈ 0.805", () => {
    const result = scoreOffer({
      compatibility: getCompatibility("PLASMA", "AB-", "O-"),  // COMPATIBLE
      distanceKm: 0,
      hasOpenRequisition: true,
      standingDemand: "LOW",
      urgency: "CRITICAL",
      hoursRemaining: 500,
      component: "PLASMA",
    });
    expect(result.score).toBeCloseTo(0.805, 2);
  });
});

// ---------------------------------------------------------------------------
// Urgency max() behaviour
// ---------------------------------------------------------------------------

describe("urgencyScore uses max(), not average", () => {
  it("NORMAL req with 2 h on platelets scores higher urgency than HIGH req with 40 h", () => {
    // 2 h remaining: clockUrgency=1-2/48≈0.958; statedUrgency=0.2; max=0.958
    const tightClock = scoreOffer(
      makeInput({ urgency: "NORMAL", hoursRemaining: 2, component: "PLATELETS" }),
    );
    // 40 h remaining: clockUrgency=1-40/48≈0.167; statedUrgency=0.6; max=0.6
    const highStated = scoreOffer(
      makeInput({ urgency: "HIGH", hoursRemaining: 40, component: "PLATELETS" }),
    );
    expect(tightClock.breakdown.urgency).toBeGreaterThan(highStated.breakdown.urgency);
  });
});

// ---------------------------------------------------------------------------
// Weights-sum assertion (fires at module load)
// ---------------------------------------------------------------------------

describe("weights-sum assertion", () => {
  it("module loads without throwing (weights sum to 1.0)", () => {
    // If weights don't sum to 1.0, the module-level assertion in scoring.ts
    // would have thrown at import time above. Getting here proves it doesn't.
    expect(() => scoreOffer(makeInput())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// reason string invariants
// ---------------------------------------------------------------------------

describe("reason string", () => {
  it("contains RhD caveat for ACCEPTABLE results", () => {
    const result = scoreOffer({
      compatibility: getCompatibility("PLATELETS", "O+", "O-"), // ACCEPTABLE
      distanceKm: 10,
      hasOpenRequisition: false,
      standingDemand: "LOW",
      urgency: "NORMAL",
      hoursRemaining: 40,
      component: "PLATELETS",
    });
    expect(result.reason.toLowerCase()).toMatch(/rhd/i);
  });

  it("is at most 140 characters", () => {
    const result = scoreOffer(makeInput());
    expect(result.reason.length).toBeLessThanOrEqual(140);
  });

  it("mentions IDENTICAL for exact match", () => {
    const result = scoreOffer(makeInput());
    expect(result.reason).toMatch(/IDENTICAL/);
  });

  it("breakdown stores raw distanceKm and hoursRemaining (not sub-scores)", () => {
    const result = scoreOffer(makeInput({ distanceKm: 17.3, hoursRemaining: 29 }));
    expect(result.breakdown.distanceKm).toBe(17.3);
    expect(result.breakdown.hoursRemaining).toBe(29);
  });
});
