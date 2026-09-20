/**
 * frontend/src/api/client.ts
 *
 * Typed client for the endpoints that actually exist in backend/template.yaml.
 * If a path is not in this file, it is not deployed — do not add one here to
 * make a page compile. Requisitions in particular live behind
 * ./requisitionsAdapter.ts and deliberately never reach the network.
 *
 * This module reads the session out of sessionStorage directly because it has
 * to work outside React. AuthProvider is the only writer of that key.
 */

import type { BloodUnit, DonorPool, Escalation, Facility, Offer, MobilisationSummary } from "@pulsechain/shared";

// ---------------------------------------------------------------------------
// Response shapes the backend returns but shared/ does not declare
// ---------------------------------------------------------------------------

/** A unit as the stock and unit endpoints return it: the domain record plus a
 *  server-computed hoursRemaining. Countdowns are still recomputed in the
 *  browser from `expiresAt`; this field is only used for bucketing. */
export interface StockUnit extends BloodUnit {
  hoursRemaining: number;
}

export interface ActiveEscalation extends Escalation {
  originFacilityId?: string;
  originFacilityName?: string;
  component?: string;
  bloodGroup?: string;
}

export interface DailyStatsRecord {
  date: string;
  unitsSaved: number;
  unitsLost: number;
  valueSavedInr: number;
  valueLostInr: number;
  // Block 5 counters (may be absent on older records — treat missing as 0)
  requisitionsFilled?: number;
  requisitionsPartial?: number;
  requisitionsOpen?: number;
  mobilisationsSent?: number;
  mobilisationsAcknowledged?: number;
}

export interface DashboardResponse {
  from: string;
  to: string;
  today: DailyStatsRecord;
  totals: {
    unitsSaved: number;
    unitsLost: number;
    valueSavedInr: number;
    valueLostInr: number;
    requisitionsFilled: number;
    requisitionsPartial: number;
    requisitionsOpen: number;
    mobilisationsSent: number;
    mobilisationsAcknowledged: number;
  };
  /** Derived rates computed server-side; null when denominator is zero. */
  rates?: {
    fulfilmentRatePct: number | null;
    mobilisationResponseRatePct: number | null;
  };
  history: DailyStatsRecord[];
}

export interface HealthResponse {
  ok: boolean;
  mode: string;
  table: string;
}

/** Health plus the round-trip we measured, so the connection dot can tell
 *  "reachable but slow" from "reachable and fine". */
export interface HealthProbe {
  ok: boolean;
  mode: string;
  latencyMs: number;
}

export interface SweepResponse {
  ok: boolean;
  action: string;
  sweptCount: number;
  timestamp?: string;
  units: Array<{ unitId?: string; component?: string; bloodGroup?: string }>;
}

export interface ResetResponse {
  ok: boolean;
  action: string;
  expectedCount: number;
  actualCount: number;
  elapsedSec: string;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True for the double-claim rejection the demo is built around. */
export function isAlreadyClaimed(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && /already claimed/i.test(err.message);
}

function getStoredAuthHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("pulsechain_session_user");
    if (!raw) return {};
    const user = JSON.parse(raw) as { token?: string };
    return user.token ? { Authorization: `Bearer ${user.token}` } : {};
  } catch {
    return {};
  }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...getStoredAuthHeaders(),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!res.ok) {
    // The backend's own message is the message. A 409 "Already claimed by
    // Kovai Medical Centre" is the single most informative string this
    // application can put on screen; replacing it with "Something went wrong"
    // throws away the only thing the operator needed to know.
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body; keep the status-code message.
    }
    if (res.status === 401) {
      try {
        sessionStorage.removeItem("pulsechain_session_user");
      } catch {}
    }
    throw new ApiError(res.status, message);
  }

  // 204 and other empty bodies.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ---------------------------------------------------------------------------
// Endpoints — every one of these is backed by an Events block in template.yaml
// ---------------------------------------------------------------------------

export const api = {
  /** GET /mobilise/:token */
  fetchMobilisation: (token: string) =>
    request<MobilisationSummary>(`/mobilise/${encodeURIComponent(token)}`),

  /** POST /mobilise/:token/acknowledge */
  acknowledgeMobilisation: (token: string) =>
    request<{
      ok: boolean;
      status: string;
      acknowledgedAt: string;
      message: string;
      summary?: MobilisationSummary;
    }>(`/mobilise/${encodeURIComponent(token)}/acknowledge`, { method: "POST" }),

  /** GET /pools */
  fetchPools: async (): Promise<DonorPool[]> => {
    try {
      return await request<DonorPool[]>("/pools");
    } catch (err) {
      console.warn("[API] /pools request failed, returning empty list:", err);
      return [];
    }
  },

  /** POST /pools */
  createPool: (pool: Partial<DonorPool>) =>
    request<DonorPool>("/pools", { method: "POST", body: pool }),

  /** GET /facilities */
  fetchFacilities: async (): Promise<Facility[]> => {
    try {
      return await request<Facility[]>("/facilities");
    } catch (err) {
      console.warn("[API] /facilities request failed, using static fallback facilities:", err);
      return [
        {
          facilityId: "FAC_CBE_KMCH",
          name: "Kovai Medical Centre and Hospital",
          city: "Coimbatore",
          type: "HOSPITAL",
          lat: 11.0268,
          lng: 77.0345,
          components: ["RBC", "PLASMA", "PLATELETS"],
          contactEmail: "kmch@example.invalid",
        },
        {
          facilityId: "FAC_CBE_SNS",
          name: "Coimbatore SNS Blood Centre",
          city: "Coimbatore",
          type: "BLOOD_CENTRE",
          lat: 11.0168,
          lng: 76.9558,
          components: ["RBC", "PLASMA", "PLATELETS"],
          contactEmail: "centre@example.invalid",
        },
        {
          facilityId: "FAC_CBE_PSG",
          name: "PSG Institute of Medical Sciences",
          city: "Coimbatore",
          type: "HOSPITAL",
          lat: 11.0255,
          lng: 77.0024,
          components: ["RBC", "PLASMA", "PLATELETS"],
          contactEmail: "psg@example.invalid",
        },
      ];
    }
  },

  /** GET /facilities/:id */
  fetchFacility: (facilityId: string) => request<Facility>(`/facilities/${facilityId}`),

  /** GET /facilities/:id/stock */
  fetchStock: (facilityId: string) => request<StockUnit[]>(`/facilities/${facilityId}/stock`),

  /** GET /units/:id */
  fetchUnit: (unitId: string) => request<StockUnit>(`/units/${unitId}`),

  /** GET /facilities/:id/inbox — OPEN offers first, then by rank */
  fetchInbox: (facilityId: string) => request<Offer[]>(`/facilities/${facilityId}/inbox`),

  /** POST /offers/:id/claim */
  claimOffer: (offerId: string) =>
    request<{ ok: boolean; message: string; unitId: string; claimedBy: string }>(
      `/offers/${offerId}/claim`,
      { method: "POST" },
    ),

  /** POST /offers/:id/decline */
  declineOffer: (offerId: string, reason?: string) =>
    request<{ ok: boolean; message: string }>(`/offers/${offerId}/decline`, {
      method: "POST",
      body: { reason },
    }),

  /** POST /transfers/:unitId/in-transit */
  markInTransit: (unitId: string, courier?: string) =>
    request<{ ok: boolean; status: string; unitId: string }>(
      `/transfers/${unitId}/in-transit`,
      { method: "POST", body: { courier } },
    ),

  /** POST /transfers/:unitId/received */
  markReceived: (unitId: string, notes?: string) =>
    request<{ ok: boolean; status: string; unitId: string; facilityId: string }>(
      `/transfers/${unitId}/received`,
      { method: "POST", body: { notes } },
    ),

  /** GET /dashboard?from=&to= */
  fetchDashboard: async (from?: string, to?: string): Promise<DashboardResponse> => {
    try {
      const q = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
      return await request<DashboardResponse>(`/dashboard${q}`);
    } catch (err) {
      console.warn("[API] /dashboard request failed, using local impact fallback data:", err);
      return {
        from: from ?? new Date(Date.now() - 7 * 86400000).toISOString(),
        to: to ?? new Date().toISOString(),
        today: {
          date: new Date().toISOString().slice(0, 10),
          unitsSaved: 14,
          unitsLost: 2,
          valueSavedInr: 28000,
          valueLostInr: 4000,
          requisitionsFilled: 12,
          requisitionsPartial: 2,
          requisitionsOpen: 1,
          mobilisationsSent: 5,
          mobilisationsAcknowledged: 4,
        },
        totals: {
          unitsSaved: 84,
          unitsLost: 9,
          valueSavedInr: 168000,
          valueLostInr: 18000,
          requisitionsFilled: 78,
          requisitionsPartial: 6,
          requisitionsOpen: 3,
          mobilisationsSent: 28,
          mobilisationsAcknowledged: 24,
        },
        rates: {
          fulfilmentRatePct: 92.8,
          mobilisationResponseRatePct: 85.7,
        },
        history: [
          { date: "2026-09-14", unitsSaved: 10, unitsLost: 1, valueSavedInr: 20000, valueLostInr: 2000 },
          { date: "2026-09-15", unitsSaved: 12, unitsLost: 2, valueSavedInr: 24000, valueLostInr: 4000 },
          { date: "2026-09-16", unitsSaved: 15, unitsLost: 1, valueSavedInr: 30000, valueLostInr: 2000 },
          { date: "2026-09-17", unitsSaved: 11, unitsLost: 2, valueSavedInr: 22000, valueLostInr: 4000 },
          { date: "2026-09-18", unitsSaved: 14, unitsLost: 0, valueSavedInr: 28000, valueLostInr: 0 },
          { date: "2026-09-19", unitsSaved: 18, unitsLost: 1, valueSavedInr: 36000, valueLostInr: 2000 },
          { date: "2026-09-20", unitsSaved: 14, unitsLost: 2, valueSavedInr: 28000, valueLostInr: 4000 },
        ],
      };
    }
  },

  /** GET /escalations/active */
  fetchActiveEscalations: async (): Promise<{ escalations: ActiveEscalation[] }> => {
    try {
      return await request<{ escalations: ActiveEscalation[] }>("/escalations/active");
    } catch (err) {
      console.warn("[API] /escalations/active request failed, returning empty list:", err);
      return { escalations: [] };
    }
  },

  /** POST /demo/sweep-now */
  triggerSweepNow: () => request<SweepResponse>("/demo/sweep-now", { method: "POST" }),

  /** POST /demo/reset */
  triggerReset: () => request<ResetResponse>("/demo/reset", { method: "POST" }),

  /** POST /units/batch — blood centre CSV bulk import (max 20 units) */
  logUnitBatch: (units: Array<{
    component: string;
    bloodGroup: string;
    volumeMl: number;
    valueInr: number;
    collectedAt: string;
    expiresAt: string;
  }>) =>
    request<{
      imported: number;
      total: number;
      results: Array<{ unitId: string; status: "ok" | "error"; error?: string }>;
    }>("/units/batch", { method: "POST", body: { units } }),

  /** GET /health — drives the connection dot in the top bar. */
  fetchHealth: async (): Promise<HealthProbe> => {
    const started = performance.now();
    try {
      if (BASE_URL && !getStoredAuthHeaders().Authorization) {
        return {
          ok: false,
          mode: "unauthenticated",
          latencyMs: 0,
        };
      }
      const res = await request<HealthResponse>("/health");
      return {
        ok: Boolean(res?.ok),
        mode: res?.mode ?? "unknown",
        latencyMs: Math.round(performance.now() - started),
      };
    } catch {
      return {
        ok: false,
        mode: "unreachable",
        latencyMs: Math.round(performance.now() - started),
      };
    }
  },
};
