/**
 * backend/src/workers/requisition-search.ts
 *
 * Network inventory search for hospital requisition escalation.
 */

import { isoNow, type Component, type BloodGroup } from "@pulsechain/shared";
import { queryAll } from "../lib/db.js";

export interface RequisitionSearchParams {
  requisitionId: string;
  facilityId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
}

export async function searchRequisitionInventory(params: RequisitionSearchParams) {
  // Check available queue for this component
  const hits = await queryAll<{ unitId: string; bloodGroup: string; status: string }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": `QUEUE#AVAILABLE#${params.component}`,
    },
  });

  const matching = hits.filter((u) => u.bloodGroup === params.bloodGroup && u.status === "AVAILABLE");

  return {
    ...params,
    filled: matching.length >= params.unitsRequested,
    availableCount: matching.length,
  };
}

export async function handler(event: RequisitionSearchParams) {
  return await searchRequisitionInventory(event);
}
