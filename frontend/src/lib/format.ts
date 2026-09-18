/**
 * frontend/src/lib/format.ts
 *
 * Presentation helpers. Dates render in the Asia/Kolkata-facing en-IN locale
 * because every facility in the corridor is in Tamil Nadu.
 */

import { formatDistanceToNowStrict } from "date-fns";

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/** "4 minutes ago" / "in 2 hours". */
export function formatRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function formatDistanceKm(km: number | undefined): string {
  if (km === undefined || Number.isNaN(km)) return "—";
  return `${km.toFixed(1)} km`;
}

export function formatHoursMinutes(hours: number): string {
  if (hours <= 0) return "0h 00m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Full rupee amount, e.g. "₹1,23,500" — Indian digit grouping. */
export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Compact rupee amount for stat tiles, e.g. "₹1.2L" / "₹84.0k". */
export function formatInrCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

/** "3 units" / "1 unit". */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
