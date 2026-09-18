// TanStack Query hooks for PulseChain API calls.
// Polling intervals are set here; no auth yet.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import type { Facility } from "@pulsechain/shared";

export function useFacilities() {
  return useQuery<Facility[], Error>({
    queryKey: ["facilities"],
    queryFn: () => apiGet<Facility[]>("/facilities"),
  });
}
