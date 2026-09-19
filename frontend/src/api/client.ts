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
  fetchPools: () => request<DonorPool[]>("/pools"),

  /** POST /pools */
  createPool: (pool: Partial<DonorPool>) =>
    request<DonorPool>("/pools", { method: "POST", body: pool }),

  /** GET /facilities */
  fetchFacilities: () => request<Facility[]>("/facilities"),

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
  fetchDashboard: (from?: string, to?: string) => {
    const q = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
    return request<DashboardResponse>(`/dashboard${q}`);
  },

  /** GET /escalations/active */
  fetchActiveEscalations: () =>
    request<{ escalations: ActiveEscalation[] }>("/escalations/active"),

  /** POST /demo/sweep-now */
  triggerSweepNow: () => request<SweepResponse>("/demo/sweep-now", { method: "POST" }),

  /** POST /demo/reset */
  triggerReset: () => request<ResetResponse>("/demo/reset", { method: "POST" }),

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
