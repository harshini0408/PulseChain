import { describe, it, expect } from "vitest";
import { padDistance, hoursRemaining, addHours, isoNow, monthKey, dayKey } from "../src/time.js";

describe("padDistance", () => {
  it("pads a single-digit integer distance", () => {
    expect(padDistance(8.2)).toBe("008.2");
  });

  it("rounds to one decimal place", () => {
    // 43.25 rounds to 43.3 (half-up)
    expect(padDistance(43.25)).toBe("043.3");
  });

  it("handles an already-exact one-decimal value", () => {
    expect(padDistance(43.3)).toBe("043.3");
  });

  it("pads zero distance", () => {
    expect(padDistance(0)).toBe("000.0");
  });

  it("handles three-digit distance", () => {
    expect(padDistance(999.9)).toBe("999.9");
  });

  it("throws when distance exceeds 999.9", () => {
    expect(() => padDistance(1000)).toThrow(RangeError);
  });

  it("handles distance from sample-items.json: 8.4 km", () => {
    expect(padDistance(8.4)).toBe("008.4");
  });

  it("handles distance from sample-items.json: 43.3 km", () => {
    expect(padDistance(43.3)).toBe("043.3");
  });
});

describe("hoursRemaining", () => {
  it("returns positive hours when not yet expired", () => {
    const now = new Date("2026-09-17T06:00:00Z");
    const expiresAt = "2026-09-19T06:00:00Z";
    expect(hoursRemaining(expiresAt, now)).toBe(48);
  });

  it("returns negative hours when already expired", () => {
    const now = new Date("2026-09-20T06:00:00Z");
    const expiresAt = "2026-09-19T06:00:00Z";
    expect(hoursRemaining(expiresAt, now)).toBe(-24);
  });

  it("returns 0 at exact expiry moment", () => {
    const ts = "2026-09-19T06:00:00Z";
    expect(hoursRemaining(ts, new Date(ts))).toBe(0);
  });
});

describe("addHours", () => {
  it("adds hours and keeps UTC format", () => {
    expect(addHours("2026-09-17T00:00:00Z", 48)).toBe("2026-09-19T00:00:00Z");
  });

  it("handles fractional hours", () => {
    expect(addHours("2026-09-17T00:00:00Z", 0.5)).toBe("2026-09-17T00:30:00Z");
  });
});

describe("isoNow", () => {
  it("returns a string without milliseconds", () => {
    const result = isoNow(new Date("2026-09-17T12:00:00.000Z"));
    expect(result).toBe("2026-09-17T12:00:00Z");
    expect(result).not.toContain(".");
  });
});

describe("monthKey", () => {
  it("extracts yyyy-mm", () => {
    expect(monthKey("2026-09-19T06:00:00Z")).toBe("2026-09");
  });
});

describe("dayKey", () => {
  it("extracts yyyy-mm-dd", () => {
    expect(dayKey("2026-09-19T06:00:00Z")).toBe("2026-09-19");
  });
});
