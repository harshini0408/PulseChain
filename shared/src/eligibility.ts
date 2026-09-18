import { DONATION_INTERVAL_DAYS } from "./config.js";
import type { Donor } from "./types.js";

export type EligibilityStatus = "ELIGIBLE" | "ELIGIBLE_IN_DAYS" | "SELF_DEFERRED";

export interface EligibilityResult {
  status: EligibilityStatus;
  isEligible: boolean;
  isSelfDeferred: boolean;
  daysRemaining: number; // 0 if eligible
  nextEligibleAt: string; // ISO UTC string
  selfDeferredUntil?: string;
  label: string;
  apheresisEligible: boolean;
  apheresisDaysRemaining: number;
}

export type DonorEligibility = EligibilityResult;

/**
 * Computes the next eligible donation date from last donation timestamp.
 * If no recorded donation, returns epoch (eligible immediately).
 */
export function computeNextEligibleDate(
  lastDonationAt?: string | null,
  intervalDays: number = DONATION_INTERVAL_DAYS.WHOLE_BLOOD
): string {
  if (!lastDonationAt) {
    return new Date(0).toISOString();
  }
  const last = new Date(lastDonationAt);
  const next = new Date(last.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

/**
 * Derives donor eligibility strictly from donation timestamps and self-deferral dates.
 * Stores and examines ZERO health/medical data.
 */
export function computeEligibility(
  donor: Pick<Donor, "lastDonationAt" | "nextEligibleAt"> & { selfDeferredUntil?: string | null },
  now: Date = new Date()
): EligibilityResult {
  const nowMs = now.getTime();

  // 1. Check self-deferral date
  if (donor.selfDeferredUntil) {
    const deferDate = new Date(donor.selfDeferredUntil);
    if (deferDate.getTime() > nowMs) {
      const daysRemaining = Math.max(1, Math.ceil((deferDate.getTime() - nowMs) / (24 * 60 * 60 * 1000)));
      return {
        status: "SELF_DEFERRED",
        isEligible: false,
        isSelfDeferred: true,
        daysRemaining,
        nextEligibleAt: donor.nextEligibleAt || donor.selfDeferredUntil,
        selfDeferredUntil: donor.selfDeferredUntil,
        label: `Self-deferred (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining)`,
        apheresisEligible: false,
        apheresisDaysRemaining: daysRemaining,
      };
    }
  }

  // 2. Check donation interval
  if (!donor.lastDonationAt) {
    return {
      status: "ELIGIBLE",
      isEligible: true,
      isSelfDeferred: false,
      daysRemaining: 0,
      nextEligibleAt: new Date(nowMs).toISOString(),
      label: "Eligible now",
      apheresisEligible: true,
      apheresisDaysRemaining: 0,
    };
  }

  // Apheresis calculation (14 days)
  const apheresisNextMs = new Date(donor.lastDonationAt).getTime() + DONATION_INTERVAL_DAYS.APHERESIS * 24 * 60 * 60 * 1000;
  const apheresisEligible = apheresisNextMs <= nowMs;
  const apheresisDaysRemaining = apheresisEligible ? 0 : Math.max(1, Math.ceil((apheresisNextMs - nowMs) / (24 * 60 * 60 * 1000)));

  const nextEligibleMs = new Date(donor.nextEligibleAt).getTime();
  if (nextEligibleMs <= nowMs) {
    return {
      status: "ELIGIBLE",
      isEligible: true,
      isSelfDeferred: false,
      daysRemaining: 0,
      nextEligibleAt: donor.nextEligibleAt,
      label: "Eligible now",
      apheresisEligible,
      apheresisDaysRemaining,
    };
  }

  const daysRemaining = Math.max(1, Math.ceil((nextEligibleMs - nowMs) / (24 * 60 * 60 * 1000)));
  return {
    status: "ELIGIBLE_IN_DAYS",
    isEligible: false,
    isSelfDeferred: false,
    daysRemaining,
    nextEligibleAt: donor.nextEligibleAt,
    label: `Eligible in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
    apheresisEligible,
    apheresisDaysRemaining,
  };
}
