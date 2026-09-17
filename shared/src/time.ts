// hoursRemaining, isPastThreshold, padDistance, isoNow
// Pure date/distance helpers — no AWS SDK, no side effects.

/**
 * Current UTC timestamp as ISO 8601 string.
 * Accepts an optional `now` override for deterministic testing.
 */
export function isoNow(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Hours remaining until `expiresAt` from `now`.
 * Returns a negative number if already expired.
 */
export function hoursRemaining(expiresAt: string, now: Date = new Date()): number {
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Returns true if more than `thresholdHours` remain until expiry.
 */
export function isPastThreshold(
  expiresAt: string,
  thresholdHours: number,
  now: Date = new Date(),
): boolean {
  return hoursRemaining(expiresAt, now) <= thresholdHours;
}

/**
 * Add `hours` to an ISO UTC string and return a new ISO UTC string.
 */
export function addHours(iso: string, hours: number): string {
  const ms = new Date(iso).getTime() + hours * 60 * 60 * 1000;
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Zero-pad a distance to the "000.0" format used in DynamoDB SK values.
 * e.g. 8.2 → "008.2", 43.25 → "043.3", 43.3 → "043.3"
 * Throws if km > 999.9.
 */
export function padDistance(km: number): string {
  if (km > 999.9) throw new RangeError(`Distance ${km} km exceeds maximum 999.9`);
  // Round to one decimal place
  const rounded = Math.round(km * 10) / 10;
  const [int, dec = "0"] = rounded.toFixed(1).split(".");
  return `${int.padStart(3, "0")}.${dec}`;
}

/**
 * Extract "yyyy-mm" from an ISO UTC string.
 * e.g. "2026-09-19T06:00:00Z" → "2026-09"
 */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Extract "yyyy-mm-dd" from an ISO UTC string.
 * e.g. "2026-09-19T06:00:00Z" → "2026-09-19"
 */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}
