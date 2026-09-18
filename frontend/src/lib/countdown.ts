/**
 * frontend/src/lib/countdown.ts
 *
 * Pure remaining-time calculation. Every countdown in the application is
 * computed in the browser from an ISO timestamp — never from a server-supplied
 * "secondsRemaining" field, which would freeze between 3.5s poll cycles.
 */

export interface CountdownState {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  /** "11h 42m" at an hour or above, "47m 03s" below it. */
  label: string;
  /** "01:29" — minute:second clock, for the offer claim window. */
  clock: string;
}

const EXPIRED: CountdownState = {
  totalSeconds: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isExpired: true,
  label: "Expired",
  clock: "00:00",
};

/** At or above this many hours a countdown reads in days. Display only. */
const DAYS_ABOVE_HOURS = 72;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function calculateRemaining(
  targetIso: string | undefined,
  now: number = Date.now(),
): CountdownState {
  if (!targetIso) return EXPIRED;

  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) return EXPIRED;

  const diffMs = targetMs - now;
  if (diffMs <= 0) return EXPIRED;

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Three bands, because the useful precision changes with the scale:
  // a plasma unit with 87 days left should not read "2099h 59m", an hour out
  // the seconds are noise, and inside the hour the seconds are the whole point.
  let label: string;
  if (hours >= DAYS_ABOVE_HOURS) {
    label = `${Math.floor(hours / 24)}d ${hours % 24}h`;
  } else if (hours >= 1) {
    label = `${hours}h ${pad(minutes)}m`;
  } else {
    label = `${minutes}m ${pad(seconds)}s`;
  }

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    isExpired: false,
    label,
    clock: `${pad(hours * 60 + minutes)}:${pad(seconds)}`,
  };
}

/** Fraction of a window still remaining, clamped to 0..1. Drives the ring arc. */
export function remainingFraction(
  startIso: string | undefined,
  endIso: string | undefined,
  now: number = Date.now(),
): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (end - now) / (end - start)));
}
