/**
 * frontend/src/api/hooks.ts
 *
 * TanStack Query hooks with live polling intervals (3.5s) for real-time console updates.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type StockUnit, type ActiveEscalation, type DashboardResponse } from "./client";
import type { Offer, Facility } from "@pulsechain/shared";

// Polling interval in milliseconds (3.5s falls strictly in the 3–5s range)
export const POLL_INTERVAL_MS = 3500;

export function useStockQuery(facilityId: string | null) {
  return useQuery<StockUnit[]>({
    queryKey: ["stock", facilityId],
    queryFn: () => (facilityId ? api.fetchStock(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useInboxQuery(facilityId: string | null) {
  return useQuery<Offer[]>({
    queryKey: ["inbox", facilityId],
    queryFn: () => (facilityId ? api.fetchInbox(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useFacilitiesQuery() {
  return useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: api.fetchFacilities,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (offerId: string) => api.claimOffer(offerId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

export function useDeclineMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      api.declineOffer(offerId, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useInTransitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitId: string) => api.markInTransit(unitId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useReceivedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitId: string) => api.markReceived(unitId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useSweepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.triggerSweepNow,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useResetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.triggerReset,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useEscalationsQuery() {
  return useQuery<ActiveEscalation[]>({
    queryKey: ["escalations", "active"],
    queryFn: async () => {
      const res = await api.fetchActiveEscalations();
      return res.escalations;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useDashboardQuery(from?: string, to?: string) {
  return useQuery<DashboardResponse>({
    queryKey: ["dashboard", from, to],
    queryFn: () => api.fetchDashboard(from, to),
    refetchInterval: 10_000, // dashboard refreshes every 10s
    staleTime: 5_000,
  });
}
