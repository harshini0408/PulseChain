import { describe, it, expect } from "vitest";
import { ringRange } from "../src/keys.js";

// SCHEMA.md rule: "~" sorts after "#", so DIST#010.0~ is included in ring 1
// but excluded from ring 2 (whose lower bound is DIST#010.0~).
// This test verifies that a facility with distanceSk "DIST#010.0#FAC" falls
// inside ring 1 bounds and outside ring 2 bounds using plain string comparison.

describe("ringRange — boundary behaviour", () => {
  // Simulate the SK a DynamoDB item would have at exactly 10.0 km
  const skAt10 = "DIST#010.0#CBE-HOSP-04";

  describe("Ring 1 (0–10 km)", () => {
    const { from, to } = ringRange(0, 10);

    it("lower bound is DIST#000.0", () => {
      expect(from).toBe("DIST#000.0");
    });

    it("upper bound is DIST#010.0~", () => {
      expect(to).toBe("DIST#010.0~");
    });

    it("facility at exactly 10.0 km is WITHIN ring 1 (SK <= upper bound)", () => {
      // "DIST#010.0#CBE-HOSP-04" < "DIST#010.0~" because "#" < "~" in ASCII
      expect(skAt10 >= from && skAt10 <= to).toBe(true);
    });
  });

  describe("Ring 2 (10–30 km)", () => {
    const { from, to } = ringRange(10, 30);

    it("lower bound is DIST#010.0~ (exclusive of exactly-10 items)", () => {
      expect(from).toBe("DIST#010.0~");
    });

    it("upper bound is DIST#030.0~", () => {
      expect(to).toBe("DIST#030.0~");
    });

    it("facility at exactly 10.0 km is NOT in ring 2 (SK < lower bound)", () => {
      // "DIST#010.0#CBE-HOSP-04" < "DIST#010.0~" → outside ring 2
      expect(skAt10 >= from).toBe(false);
    });
  });

  describe("Ring 3 (30–999.9 km)", () => {
    const { from, to } = ringRange(30, 999.9);

    it("lower bound is DIST#030.0~", () => {
      expect(from).toBe("DIST#030.0~");
    });

    it("upper bound is DIST#999.9~", () => {
      expect(to).toBe("DIST#999.9~");
    });
  });

  it("a facility at 8.4 km falls in ring 1 and not ring 2", () => {
    const sk84 = "DIST#008.4#CBE-HOSP-04";
    const r1 = ringRange(0, 10);
    const r2 = ringRange(10, 30);
    expect(sk84 >= r1.from && sk84 <= r1.to).toBe(true);
    expect(sk84 >= r2.from).toBe(false);
  });

  it("a facility at 43.3 km falls in ring 3 and not ring 2", () => {
    const sk433 = "DIST#043.3#TUP-HOSP-01";
    const r2 = ringRange(10, 30);
    const r3 = ringRange(30, 999.9);
    expect(sk433 >= r2.from && sk433 <= r2.to).toBe(false);
    expect(sk433 >= r3.from && sk433 <= r3.to).toBe(true);
  });
});
