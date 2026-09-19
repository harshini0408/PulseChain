/**
 * backend/src/workers/donor-tier.ts
 *
 * Activates community/college donor pools for unfilled hospital requisitions.
 * Crucial invariants:
 * - Donors NEVER appear for surplus units; only for requisitions.
 * - Donors are aggregate-only: no donor IDs, names, or accounts.
 * - Deterministic 5-tier pool ranking:
 *   1. Blood-group match (pool has non-zero count for requested bloodGroup)
 *   2. 24h cooldown status (unmobilised or >= 24h ago ranks ahead of in-cooldown)
 *   3. Haversine distance from hospital
 *   4. Requested-group donor count
 *   5. poolId lexicographical tie-breaker
 * - Fixed selection rule: select up to 5 eligible pools.
 * - Requisition-level idempotency: duplicate activations for same requisition return existing status.
 * - Atomic/conditional lastMobilisedAt update to prevent concurrent requisitions from racing on same pool.
 */

import { randomUUID } from "crypto";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  isoNow,
  hoursBetween,
  addHours,
  getConfig,
  facilityKey,
  poolKey,
  requisitionKey,
  mobilisationKey,
  type Component,
  type BloodGroup,
  type DonorPool,
  type Facility,
  type Requisition,
  type MobilisationRecord,
} from "@pulsechain/shared";
import { haversineKm } from "@pulsechain/seed/src/distances-util.js";
import { docClient, getItem, putItem, queryAll, requireTableName } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";
import { sendMobilisationEmailNotification } from "../lib/mobilisation-notifications.js";
import { recordMobilisationSent, recordRequisitionFilled } from "../lib/stats.js";

export interface DonorTierParams {
  requisitionId: string;
  facilityId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  now?: string;
}

export interface SelectedPoolSummary {
  poolId: string;
  name: string;
  rank: number;
  distanceKm: number;
  hasBloodGroup: boolean;
  donorCount: number;
  inCooldown: boolean;
  token?: string;
}

export interface DonorTierResult {
  requisitionId: string;
  facilityId: string;
  poolsAlerted: number;
  status: string;
  selectedPools?: SelectedPoolSummary[];
}

export async function activateDonorTier(params: DonorTierParams): Promise<DonorTierResult> {
  const ts = params.now ?? isoNow();

  // ── 1. Requisition-Level Idempotency ────────────────────────────────────
  const reqKeys = requisitionKey(params.requisitionId);
  const existingReq = await getItem<Requisition>(reqKeys.PK, reqKeys.SK);
  if (existingReq && existingReq.status === "DONOR_TIER") {
    return {
      requisitionId: params.requisitionId,
      facilityId: params.facilityId,
      poolsAlerted: 0,
      status: "DONOR_TIER_ALREADY_ACTIVATED",
    };
  }

  // ── 2. Resolve Hospital Coordinates ─────────────────────────────────────
  const hospitalKeys = facilityKey(params.facilityId);
  const hospital = await getItem<Facility>(hospitalKeys.PK, hospitalKeys.SK);
  // Default to Coimbatore centre (11.0168, 76.9558) if profile coordinates unavailable
  const hospitalLat = hospital?.lat ?? 11.0168;
  const hospitalLng = hospital?.lng ?? 76.9558;

  // ── 3. Query Registered Pools (GSI1 POOLS per SCHEMA.md #15) ────────────
  const pools = await queryAll<DonorPool & { PK: string; SK: string }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": "POOLS",
    },
  });

  // ── 4. Deterministic 5-Stage Ranking ─────────────────────────────────────
  // Stage 1: blood-group match (non-zero count for requested blood group)
  // Stage 2: 24h cooldown status (not mobilised in last 24h)
  // Stage 3: distance from hospital (haversine)
  // Stage 4: donor count for requested blood group
  // Stage 5: poolId tie-breaker
  const ranked = [...pools].sort((a, b) => {
    const countA = a.groupCounts?.[params.bloodGroup] ?? 0;
    const countB = b.groupCounts?.[params.bloodGroup] ?? 0;
    const matchA = countA > 0 ? 1 : 0;
    const matchB = countB > 0 ? 1 : 0;
    if (matchA !== matchB) return matchB - matchA;

    const inCooldownA = a.lastMobilisedAt && hoursBetween(a.lastMobilisedAt, ts) < 24 ? 1 : 0;
    const inCooldownB = b.lastMobilisedAt && hoursBetween(b.lastMobilisedAt, ts) < 24 ? 1 : 0;
    if (inCooldownA !== inCooldownB) return inCooldownA - inCooldownB;

    const distA = haversineKm(hospitalLat, hospitalLng, a.lat, a.lng);
    const distB = haversineKm(hospitalLat, hospitalLng, b.lat, b.lng);
    if (Math.abs(distA - distB) > 0.001) return distA - distB;

    if (countA !== countB) return countB - countA;

    return a.poolId.localeCompare(b.poolId);
  });

  // ── 5. Fixed Selection: Select up to 5 eligible pools ────────────────────
  const eligible = ranked.filter((p) => (p.groupCounts?.[params.bloodGroup] ?? 0) > 0);
  const candidates = eligible.slice(0, 5);

  // ── 6. Atomic Mobilisation: Update lastMobilisedAt conditionally ─────────
  const cutoff24h = new Date(new Date(ts).getTime() - 24 * 60 * 60 * 1000).toISOString();
  const successfullyMobilised: SelectedPoolSummary[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const pool = candidates[i];
    const distanceKm = Math.round(haversineKm(hospitalLat, hospitalLng, pool.lat, pool.lng) * 10) / 10;
    const donorCount = pool.groupCounts?.[params.bloodGroup] ?? 0;
    const inCooldown = Boolean(pool.lastMobilisedAt && hoursBetween(pool.lastMobilisedAt, ts) < 24);

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: requireTableName(),
          Key: poolKey(pool.poolId),
          UpdateExpression: "SET lastMobilisedAt = :ts, lastMobilisationStatus = :pStatus",
          ConditionExpression:
            "attribute_not_exists(lastMobilisedAt) OR lastMobilisedAt = :nullVal OR lastMobilisedAt <= :cutoff",
          ExpressionAttributeValues: {
            ":ts": ts,
            ":nullVal": null,
            ":cutoff": cutoff24h,
            ":pStatus": "PENDING",
          },
        }),
      );

      // Generate unpredictable, single-use, time-limited token
      const token = randomUUID().replace(/-/g, "");
      const expiresAt = addHours(ts, getConfig().mobilisationExpiryHours);

      const mobItem: MobilisationRecord = {
        ...mobilisationKey(token),
        token,
        poolId: pool.poolId,
        poolName: pool.name,
        requisitionId: params.requisitionId,
        expiresAt,
        status: "PENDING",
        hospitalId: params.facilityId,
        hospitalName: hospital?.name ?? params.facilityId,
        hospitalCity: hospital?.city ?? "Coimbatore",
        component: params.component,
        bloodGroup: params.bloodGroup,
        unitsRequested: params.unitsRequested,
        urgency: existingReq?.urgency ?? "NORMAL",
        neededBy: existingReq?.neededBy ?? addHours(ts, 24),
        createdAt: ts,
        acknowledgedAt: null,
      };

      await putItem(mobItem);

      // Send SES email to pool contact (non-blocking for sandbox / demo .invalid)
      await sendMobilisationEmailNotification({
        token,
        poolId: pool.poolId,
        poolName: pool.name,
        contactName: pool.contactName,
        contactEmail: pool.contactEmail,
        component: params.component,
        bloodGroup: params.bloodGroup,
        unitsRequested: params.unitsRequested,
        hospitalName: hospital?.name ?? params.facilityId,
        hospitalCity: hospital?.city ?? "Coimbatore",
      });

      // Block 5: count each pool as a mobilisation sent
      void recordMobilisationSent(ts).catch((e) =>
        console.warn("[donor-tier] mobilisationsSent counter failed:", e),
      );

      successfullyMobilised.push({
        poolId: pool.poolId,
        name: pool.name,
        rank: successfullyMobilised.length + 1,
        distanceKm,
        hasBloodGroup: donorCount > 0,
        donorCount,
        inCooldown,
        token,
      });
    } catch (err: any) {
      // If condition failed, another concurrent requisition mobilised this pool
      console.warn(`[donor-tier] Pool ${pool.poolId} skipped due to concurrent mobilisation:`, err?.message);
    }
  }

  // ── 7. Mark Requisition as DONOR_TIER ───────────────────────────────────
  if (existingReq) {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: requireTableName(),
          Key: reqKeys,
          UpdateExpression: "SET #status = :dt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":dt": "DONOR_TIER" },
        }),
      );
      // Block 5: DONOR_TIER outcome counts as filled for fulfilment rate
      if (successfullyMobilised.length > 0) {
        void recordRequisitionFilled(ts).catch((e) =>
          console.warn("[donor-tier] requisitionsFilled counter failed:", e),
        );
      }
    } catch (err: any) {
      console.warn(`[donor-tier] Could not update requisition status for ${params.requisitionId}:`, err?.message);
    }
  }

  // ── 8. Write DONOR_TIER_TRIGGERED Audit Event ───────────────────────────
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
      poolsAlertedCount: successfullyMobilised.length,
      selectedPools: successfullyMobilised,
      reason: "No compatible surplus units available across network",
    },
  });

  return {
    requisitionId: params.requisitionId,
    facilityId: params.facilityId,
    poolsAlerted: successfullyMobilised.length,
    status: "DONOR_TIER_ACTIVATED",
    selectedPools: successfullyMobilised,
  };
}

export async function handler(event: DonorTierParams) {
  return await activateDonorTier(event);
}
