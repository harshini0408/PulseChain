import { describe, it, expect } from "vitest";
import {
  computeEligibility,
  computeNextEligibleDate,
} from "../src/eligibility.js";
import { DONATION_INTERVAL_DAYS } from "../src/config.js";

describe("Donor Eligibility Engine", () => {
  const now = new Date("2026-09-18T10:00:00Z");

  it("marks a donor with no prior donations as eligible immediately", () => {
    const result = computeEligibility(
      {
        lastDonationAt: null,
        nextEligibleAt: new Date(0).toISOString(),
      },
      now
    );

    expect(result.status).toBe("ELIGIBLE");
    expect(result.isEligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.label).toBe("Eligible now");
  });

  it("marks a donor who donated 95 days ago as eligible now", () => {
    const lastDonationAt = new Date(now.getTime() - 95 * 24 * 3600 * 1000).toISOString();
    const nextEligibleAt = computeNextEligibleDate(lastDonationAt, DONATION_INTERVAL_DAYS.WHOLE_BLOOD);

    const result = computeEligibility(
      {
        lastDonationAt,
        nextEligibleAt,
      },
      now
    );

    expect(result.status).toBe("ELIGIBLE");
    expect(result.isEligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
  });

  it("marks a donor who donated 30 days ago as ELIGIBLE_IN_DAYS with ~60 days remaining", () => {
    const lastDonationAt = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const nextEligibleAt = computeNextEligibleDate(lastDonationAt, DONATION_INTERVAL_DAYS.WHOLE_BLOOD);

    const result = computeEligibility(
      {
        lastDonationAt,
        nextEligibleAt,
      },
      now
    );

    expect(result.status).toBe("ELIGIBLE_IN_DAYS");
    expect(result.isEligible).toBe(false);
    expect(result.daysRemaining).toBe(60);
    expect(result.label).toBe("Eligible in 60 days");
  });

  it("marks a donor with an active self-deferral as SELF_DEFERRED", () => {
    const deferUntil = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString();

    const result = computeEligibility(
      {
        lastDonationAt: null,
        nextEligibleAt: new Date(0).toISOString(),
        selfDeferredUntil: deferUntil,
      },
      now
    );

    expect(result.status).toBe("SELF_DEFERRED");
    expect(result.isEligible).toBe(false);
    expect(result.daysRemaining).toBe(14);
    expect(result.label).toContain("Self-deferred (14 days remaining)");
  });

  it("clears self-deferral once the deferral date has passed", () => {
    const expiredDefer = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();

    const result = computeEligibility(
      {
        lastDonationAt: null,
        nextEligibleAt: new Date(0).toISOString(),
        selfDeferredUntil: expiredDefer,
      },
      now
    );

    expect(result.status).toBe("ELIGIBLE");
    expect(result.isEligible).toBe(true);
  });

  it("correctly computes 14-day interval for apheresis/platelets", () => {
    const lastDonationAt = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString();
    const nextEligibleAt = computeNextEligibleDate(lastDonationAt, DONATION_INTERVAL_DAYS.APHERESIS);

    const result = computeEligibility(
      {
        lastDonationAt,
        nextEligibleAt,
      },
      now
    );

    expect(result.status).toBe("ELIGIBLE_IN_DAYS");
    expect(result.daysRemaining).toBe(4);
  });
});
