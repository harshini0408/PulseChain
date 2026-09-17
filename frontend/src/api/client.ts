import type {
  BloodUnit,
  Offer,
  Requisition,
  Escalation,
  Facility,
  DailyStats,
  CreateUnitInput,
  CreateRequisitionInput,
  ParsedRequisition,
} from "@pulsechain/shared";

const API_BASE = import.meta.env.VITE_API_URL || "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com";

interface ApiOptions extends RequestInit {
  facilityId?: string;
  role?: string;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.facilityId ? { "x-facility-id": options.facilityId } : {}),
    ...(options.role ? { "x-role": options.role } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error || errJson.message) {
        errorMsg = errJson.error || errJson.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Facilities
  getFacilities: () => request<Facility[]>("/facilities"),
  getFacilityById: (id: string) => request<Facility>(`/facilities/${id}`),

  // Stock & Units
  getStock: (facilityId: string) =>
    request<BloodUnit[]>(`/facilities/${facilityId}/stock`, { facilityId }),
  getUnitById: (id: string) =>
    request<{ unit: BloodUnit; timeline: any[] }>(`/units/${id}`),
  createUnit: (data: CreateUnitInput, facilityId: string) =>
    request<BloodUnit>("/units", {
      method: "POST",
      body: JSON.stringify(data),
      facilityId,
    }),

  // Offers & Inbox
  getInbox: (facilityId: string) =>
    request<Offer[]>(`/inbox?facilityId=${facilityId}`, { facilityId }),
  claimOffer: (
    offerId: string,
    payload: {
      unitId: string;
      escalationId?: string;
      ring?: number;
      recipientFacilityId: string;
    }
  ) =>
    request<{ success: boolean; unit: BloodUnit; offer: Offer }>(
      `/offers/${encodeURIComponent(offerId)}/claim`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        facilityId: payload.recipientFacilityId,
      }
    ),
  declineOffer: (
    offerId: string,
    payload: {
      unitId: string;
      escalationId?: string;
      ring?: number;
      recipientFacilityId: string;
      reason?: string;
    }
  ) =>
    request<{ success: boolean }>(
      `/offers/${encodeURIComponent(offerId)}/decline`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        facilityId: payload.recipientFacilityId,
      }
    ),

  // Transfers
  markInTransit: (unitId: string, facilityId: string, details?: any) =>
    request<{ success: boolean; unit: BloodUnit }>(
      `/units/${unitId}/in-transit`,
      {
        method: "POST",
        body: JSON.stringify(details || {}),
        facilityId,
      }
    ),
  markReceived: (unitId: string, facilityId: string, details?: any) =>
    request<{ success: boolean; unit: BloodUnit }>(
      `/units/${unitId}/received`,
      {
        method: "POST",
        body: JSON.stringify(details || {}),
        facilityId,
      }
    ),

  // Requisitions
  getRequisitions: (hospitalId?: string) =>
    request<Requisition[]>(
      hospitalId ? `/requisitions?hospitalId=${hospitalId}` : "/requisitions"
    ),
  createRequisition: (data: CreateRequisitionInput, hospitalId: string) =>
    request<Requisition>("/requisitions", {
      method: "POST",
      body: JSON.stringify(data),
      facilityId: hospitalId,
    }),
  parseRequisitionAI: (text: string) =>
    request<{ success: boolean; data: ParsedRequisition }>(
      "/requisitions/parse",
      {
        method: "POST",
        body: JSON.stringify({ text }),
      }
    ),

  // Escalations & Impact Dashboard
  getActiveEscalations: () => request<Escalation[]>("/escalations/active"),
  getDashboardImpact: () =>
    request<{
      unitsSaved: number;
      unitsLost: number;
      valueSavedInr: number;
      valueLostInr: number;
      activeEscalations: number;
      successRate: number;
      trend: Array<{ date: string } & DailyStats>;
    }>("/dashboard/impact"),
};
