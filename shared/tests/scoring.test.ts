import { describe, it } from "vitest";

// Scoring/ranking tests require compatibility.ts to be implemented first.
// These tests MUST pass before the demo.

describe("rankCandidates", () => {
  it.todo("excludes INCOMPATIBLE candidates");
  it.todo("ranks IDENTICAL compatibility above COMPATIBLE");
  it.todo("closer distance ranks higher among equal compatibility");
  it.todo("candidate with open matching requisition ranks higher");
  it.todo("CRITICAL urgency boosts score");
  it.todo("ties broken by lower distanceKm then lexicographic facilityId");
  it.todo("returns correct per-factor breakdown scores");
  it.todo("reason text is a non-empty human-readable sentence");
  it.todo("empty candidates list returns empty array");
  it.todo("all INCOMPATIBLE candidates returns empty array");
});
