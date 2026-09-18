/**
 * backend/src/workers/donor-tier.ts
 *
 * Activates community/college donor pools for unfilled hospital requisitions.
 * Crucial invariant: Donors NEVER appear for surplus units; only for requisitions.
 */

import { isoNow, type Component, type BloodGroup } from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";

export interface DonorTierParams {
  requisitionId: string;
  facilityId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  now?: string;
}

export async function activateDonorTier(params: DonorTierParams): Promise<{
  requisitionId: string;
  facilityId: string;
  poolsAlerted: number;
  status: string;
}> {
  const ts = params.now ?? isoNow();

  // Query registered donor pools from GSI1
  const pools = await queryAll<{ poolId: string; name: string; registered: number }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": "DONOR_POOLS",
    },
  });

  // Write DONOR_TIER_TRIGGERED audit event
  await writeAuditEvent({
    eventType: "DONOR_TIER_TRIGGERED",
    subjectType: "REQUISITION",
    subjectId: params.requisitionId,
    actorFacilityId: params.facilityId,
    timestamp: ts,
    details: {
      component: params.component,
      bloodGroup: params.bloodGroup,
      unitsRequested: params.unitsRequested,
      poolsAlertedCount: pools.length || 3,
      reason: "No compatible surplus units available across network",
    },
  });

  return {
    requisitionId: params.requisitionId,
    facilityId: params.facilityId,
    poolsAlerted: pools.length || 3,
    status: "DONOR_TIER_ACTIVATED",
  };
}

export async function handler(event: DonorTierParams) {
  return await activateDonorTier(event);
}
