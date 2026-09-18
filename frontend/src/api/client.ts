/**
 * frontend/src/api/client.ts
 *
 * Typed API client for PulseChain backend endpoints.
 * Automatically injects auth headers from window session and preserves
 * backend error messages (such as 409 "Already claimed by <facility>").
 */

import type { BloodUnit, Offer, Facility, Escalation } from "@pulsechain/shared";

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

function getStoredAuthHeaders(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("pulsechain_session_user");
    if (raw) {
      const user = JSON.parse(raw);
      const headers: Record<string, string> = {};
      if (user.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
      return headers;
    }
  } catch {
    // ignore
  }
  return {};
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    customHeaders?: Record<string, string>;
  } = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const authHeaders = getStoredAuthHeaders();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders,
    ...(options.customHeaders ?? {}),
  };

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errorBody = await res.json();
      if (errorBody?.error) {
        message = errorBody.error;
      } else if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export interface StockUnit extends BloodUnit {
  hoursRemaining: number;
}

// ---------------------------------------------------------------------------
// Typed API Endpoints
// ---------------------------------------------------------------------------

export const api = {
  /** GET /facilities/:id/stock */
  fetchStock: (facilityId: string) =>
    request<StockUnit[]>(`/facilities/${facilityId}/stock`),

  /** GET /facilities/:id/inbox */
  fetchInbox: (facilityId: string) =>
    request<Offer[]>(`/facilities/${facilityId}/inbox`),

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

  /** POST /demo/sweep-now */
  triggerSweepNow: () =>
    request<{ ok: boolean; action: string; sweptCount: number; units: any[] }>(
      `/demo/sweep-now`,
      { method: "POST" },
    ),

  /** POST /demo/reset */
  triggerReset: () =>
    request<{ ok: boolean; action: string; expectedCount: number; actualCount: number; elapsedSec: string }>(
      `/demo/reset`,
      { method: "POST" },
    ),

  /** GET /facilities */
  fetchFacilities: () => request<Facility[]>("/facilities"),

  /** GET /dashboard */
  fetchDashboard: (from?: string, to?: string) => {
    const q = from && to ? `?from=${from}&to=${to}` : "";
    return request<DashboardResponse>(`/dashboard${q}`);
  },

  /** GET /escalations/active */
  fetchActiveEscalations: () =>
    request<{ escalations: ActiveEscalation[] }>("/escalations/active"),

  /** POST /requisitions */
  createRequisition: (data: any) =>
    request<{ requisition: any }>("/requisitions", {
      method: "POST",
      body: data,
    }),

  // ---------------------------------------------------------------------------
  // Donors
  // ---------------------------------------------------------------------------
  registerDonor: (data: any) =>
    request<{ donor: any; eligibility: any }>("/donors/register", {
      method: "POST",
      body: data,
    }),
  getDonor: (id: string, donorIdHeader?: string) =>
    request<{ donor: any; eligibility: any }>(`/donors/${id}`, {
      customHeaders: donorIdHeader
        ? { "x-user-id": donorIdHeader, "x-role": "DONOR" }
        : {},
    }),
  deferDonor: (id: string, deferredUntil?: string | null) =>
    request<{ success: boolean; donor: any; eligibility: any }>(`/donors/${id}/defer`, {
      method: "POST",
      body: { deferredUntil: deferredUntil || null },
    }),

  // ---------------------------------------------------------------------------
  // Communities
  // ---------------------------------------------------------------------------
  registerCommunity: (data: any) =>
    request<{ community: any }>("/communities/register", {
      method: "POST",
      body: data,
    }),
  getCommunity: (id: string, coordinatorCommunityId?: string) =>
    request<{
      community: any;
      members: any[];
      alerts: any[];
      stats: {
        totalMembers: number;
        eligibleNowCount: number;
        activeAlerts: number;
        totalMobilised: number;
      };
    }>(`/communities/${id}`, {
      customHeaders: {
        "x-facility-id": coordinatorCommunityId || id,
        "x-role": "COMMUNITY_COORDINATOR",
      },
    }),
  respondToAlert: (
    communityId: string,
    alertId: string,
    payload: { mobilisedCount: number }
  ) =>
    request<{ success: boolean; alert: any }>(
      `/communities/${communityId}/alerts/${alertId}/respond`,
      {
        method: "POST",
        body: payload,
        customHeaders: {
          "x-facility-id": communityId,
          "x-role": "COMMUNITY_COORDINATOR",
        },
      }
    ),
  confirmDonation: (
    communityId: string,
    data: {
      donorId: string;
      facilityId: string;
      componentType?: string;
      donationDate?: string;
    }
  ) =>
    request<{ success: boolean; donor: any; eligibility: any }>(
      `/communities/${communityId}/donations`,
      {
        method: "POST",
        body: data,
        customHeaders: {
          "x-facility-id": communityId,
          "x-role": "COMMUNITY_COORDINATOR",
        },
      }
    ),
};
