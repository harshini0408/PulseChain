/**
 * frontend/src/api/hooks.ts
 *
 * Every network read and write in the application goes through this file.
 * No component calls `fetch` directly.
 *
 * The console pages poll on a 3.5s cadence. That number is deliberate: fast
 * enough that a sweep, an offer and a claim each land inside one visible beat
 * on camera, slow enough not to hammer the API. Do not change it.
 */

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { CreateRequisitionInput, Facility, Offer, Requisition } from "@pulsechain/shared";
import {
  api,
  type ActiveEscalation,
  type DashboardResponse,
  type HealthProbe,
  type StockUnit,
} from "./client";

export const POLL_INTERVAL_MS = 3500;

/** The connection dot polls slower than the consoles — it is a heartbeat, not data. */
export const HEALTH_POLL_INTERVAL_MS = 15_000;

/** Every key in one place, so the demo toolbar can invalidate all of them. */
export const queryKeys = {
  facilities: ["facilities"] as const,
  facility: (id: string | null) => ["facility", id] as const,
  stock: (facilityId: string | null) => ["stock", facilityId] as const,
  unit: (unitId: string | null) => ["unit", unitId] as const,
  inbox: (facilityId: string | null) => ["inbox", facilityId] as const,
  escalations: ["escalations", "active"] as const,
  dashboard: (from?: string, to?: string) => ["dashboard", from, to] as const,
  health: ["health"] as const,
  requisitions: (hospitalId: string | null) => ["requisitions", hospitalId] as const,
  requisition: (id: string | null) => ["requisition", id] as const,
  requisitionEvents: (id: string | null) => ["requisition-events", id] as const,
};

/**
 * Refresh everything. Used after a sweep or a reset, where server state has
 * moved underneath every open window at once.
 */
export function invalidateEverything(client: QueryClient): Promise<void> {
  return client.invalidateQueries().then(() => undefined);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useStockQuery(facilityId: string | null) {
  return useQuery<StockUnit[]>({
    queryKey: queryKeys.stock(facilityId),
    queryFn: () => api.fetchStock(facilityId as string),
    enabled: Boolean(facilityId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useUnitQuery(unitId: string | null) {
  return useQuery<StockUnit>({
    queryKey: queryKeys.unit(unitId),
    queryFn: () => api.fetchUnit(unitId as string),
    enabled: Boolean(unitId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/**
 * Several units at once.
 *
 * A hospital cannot get its in-flight units from its own stock query: the
 * backend only moves a unit's `facilityId` to the recipient on RECEIVED
 * (see backend/src/api/transfers.ts), so CLAIMED and IN_TRANSIT units are
 * still filed under the origin centre. The inbox names which units this
 * facility claimed; this hook reads each one's live status by ID.
 */
export function useUnitsQuery(unitIds: string[]) {
  const results = useQueries({
    queries: unitIds.map((unitId) => ({
      queryKey: queryKeys.unit(unitId),
      queryFn: () => api.fetchUnit(unitId),
      refetchInterval: POLL_INTERVAL_MS,
    })),
  });

  return {
    units: results
      .map((r) => r.data)
      .filter((u): u is StockUnit => Boolean(u)),
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => results.forEach((r) => void r.refetch()),
  };
}

export function useInboxQuery(facilityId: string | null) {
  return useQuery<Offer[]>({
    queryKey: queryKeys.inbox(facilityId),
    queryFn: () => api.fetchInbox(facilityId as string),
    enabled: Boolean(facilityId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useFacilitiesQuery() {
  return useQuery<Facility[]>({
    queryKey: queryKeys.facilities,
    queryFn: api.fetchFacilities,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFacilityQuery(facilityId: string | null) {
  return useQuery<Facility>({
    queryKey: queryKeys.facility(facilityId),
    queryFn: () => api.fetchFacility(facilityId as string),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEscalationsQuery() {
  return useQuery<ActiveEscalation[]>({
    queryKey: queryKeys.escalations,
    queryFn: async () => (await api.fetchActiveEscalations()).escalations,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useDashboardQuery(from?: string, to?: string) {
  return useQuery<DashboardResponse>({
    queryKey: queryKeys.dashboard(from, to),
    queryFn: () => api.fetchDashboard(from, to),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useHealthQuery() {
  return useQuery<HealthProbe>({
    queryKey: queryKeys.health,
    queryFn: api.fetchHealth,
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    // A heartbeat that retries hides the outage it exists to report.
    retry: false,
  });
}

/**
 * Facility-name lookup. Offers, escalations and transfers all carry facility
 * IDs; every one of them needs the same "what is this place called" mapping.
 */
export function useFacilityLookup() {
  const { data: facilities, isLoading } = useFacilitiesQuery();

  const byId = useMemo(() => {
    const map = new Map<string, Facility>();
    for (const f of facilities ?? []) map.set(f.facilityId, f);
    return map;
  }, [facilities]);

  const nameOf = useCallback(
    // Falls back to the raw ID rather than inventing a name.
    (facilityId: string | undefined): string =>
      (facilityId ? byId.get(facilityId)?.name : undefined) ?? facilityId ?? "Unknown facility",
    [byId],
  );

  return { facilities: facilities ?? [], byId, nameOf, isLoading };
}

// ---------------------------------------------------------------------------
// Writes
//
// Mutations never swallow an error: the page needs the backend's message,
// especially the 409 on a lost claim race.
// ---------------------------------------------------------------------------

export function useClaimMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => api.claimOffer(offerId),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["inbox"] });
      client.invalidateQueries({ queryKey: ["stock"] });
      client.invalidateQueries({ queryKey: queryKeys.escalations });
    },
  });
}

export function useDeclineMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      api.declineOffer(offerId, reason),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useInTransitMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, courier }: { unitId: string; courier?: string }) =>
      api.markInTransit(unitId, courier),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["stock"] });
      client.invalidateQueries({ queryKey: ["unit"] });
    },
  });
}

export function useReceivedMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, notes }: { unitId: string; notes?: string }) =>
      api.markReceived(unitId, notes),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["stock"] });
      client.invalidateQueries({ queryKey: ["unit"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Sweep and reset move server state under every open window, so both
 *  invalidate every key rather than a chosen few. */
export function useSweepMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.triggerSweepNow,
    onSettled: () => invalidateEverything(client),
  });
}

export function useResetMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.triggerReset,
    onSettled: () => invalidateEverything(client),
  });
}

// ---------------------------------------------------------------------------
// Requisitions
//
// Persistent, DynamoDB-backed queries and mutations via deployed API routes.
// ---------------------------------------------------------------------------

export function useRequisitionsQuery(hospitalId: string | null) {
  return useQuery<Requisition[]>({
    queryKey: queryKeys.requisitions(hospitalId),
    queryFn: () => api.fetchRequisitions(hospitalId as string),
    enabled: Boolean(hospitalId),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useRequisitionQuery(id: string | null) {
  return useQuery<Requisition>({
    queryKey: queryKeys.requisition(id),
    queryFn: () => api.fetchRequisition(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_MS;
      const terminalStatuses = ["FULFILLED", "CANCELLED", "EXPIRED", "EXHAUSTED", "CLOSED"];
      if (terminalStatuses.includes(data.status)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}

export function useRequisitionEventsQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.requisitionEvents(id),
    queryFn: () => api.fetchRequisitionEvents(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      // Query events at same cadence or stop if parent requisition query is terminal
      return POLL_INTERVAL_MS;
    },
  });
}

export function useCancelRequisitionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.cancelRequisition(id, reason),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: queryKeys.requisition(variables.id) });
      client.invalidateQueries({ queryKey: queryKeys.requisitionEvents(variables.id) });
      client.invalidateQueries({ queryKey: ["requisitions"] });
    },
  });
}

export function useCreateRequisitionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequisitionInput & { idempotencyKey?: string }) => {
      const { idempotencyKey, ...data } = input;
      const key =
        idempotencyKey ||
        (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `IDEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      return api.createRequisition(data, key);
    },
    onSuccess: (created) => {
      const facilityId = created.facilityId || created.hospitalId;
      if (facilityId) {
        client.invalidateQueries({ queryKey: queryKeys.requisitions(facilityId) });
      }
      client.invalidateQueries({ queryKey: ["requisitions"] });
    },
  });
}
