import { randomBytes } from "node:crypto";
import {
  BLOOD_GROUPS,
  isUsable,
  getCompatibility,
  communityKey,
  communityAlertKey,
  communityAlertGsi1,
  communityAlertGsi2,
  donorKey,
  facilityKey,
  requisitionKey,
  computeEligibility,
  type BloodGroup,
  type CompatibilityLevel,
  type Community,
  type CommunityAlert,
  type Donor,
  type Facility,
  type Requisition,
  type WithKeys,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface DonorTierInput {
  reqId?: string;
  requisitionId?: string;
  escalationId?: string;
  unitId?: string;
  unitsRemaining?: number;
  unitsRequested?: number;
  unitsFulfilled?: number;
  status?: string;
}

export interface DonorTierOutput {
  triggered: boolean;
  reqId?: string;
  reason?: string;
  unitsRemaining?: number;
  unitsTargeted?: number;
  alreadyMobilized?: boolean;
  communitiesAlerted: Array<{
    communityId: string;
    name: string;
    eligibleCount: number;
    score: number;
    rank: number;
  }>;
}

export async function handler(event: DonorTierInput): Promise<DonorTierOutput> {
  const reqId = event.reqId || event.requisitionId;

  // Hard rule: Donors are NEVER alerted for surplus units, only exhausted requisitions
  if (!reqId) {
    return {
      triggered: false,
      reason: "Surplus units do not alert community donors (Institutional tier only)",
      communitiesAlerted: [],
    };
  }

  // 1. Fetch requisition
  const reqKeys = requisitionKey(reqId);
  const req = await getItem<Requisition & WithKeys<Requisition>>(reqKeys.PK, reqKeys.SK);
  if (!req) {
    return {
      triggered: false,
      reason: `Requisition ${reqId} not found`,
      communitiesAlerted: [],
    };
  }

  // Calculate remaining units needed
  const unitsFulfilled = req.unitsFulfilled ?? req.unitsFilled ?? 0;
  const unitsRemaining = event.unitsRemaining ?? (req.unitsRemaining ?? Math.max(0, req.unitsRequested - unitsFulfilled));

  // If already fully fulfilled or cancelled, do not trigger donor tier
  if (req.status === "CANCELLED" || req.status === "CLOSED") {
    return {
      triggered: false,
      reqId,
      reason: "Requisition was cancelled; aborting donor mobilisation",
      communitiesAlerted: [],
    };
  }

  if (unitsRemaining <= 0 || req.status === "FULFILLED" || req.status === "FILLED") {
    return {
      triggered: false,
      reqId,
      reason: "Requisition already fulfilled from institutional inventory",
      communitiesAlerted: [],
    };
  }

  // Idempotency: Check if alerts were already generated for this requisition
  const existingAlerts = await queryAll<CommunityAlert & Record<string, any>>({
    indexName: "GSI2",
    keyCondition: "GSI2PK = :pk",
    values: {
      ":pk": `REQ#${reqId}#ALERTS`,
    },
  });

  if ((existingAlerts && existingAlerts.length > 0) || req.status === "DONOR_MOBILIZING" || req.status === "EXHAUSTED") {
    console.log(`[donor-tier] Requisition ${reqId} already processed by donor tier (status=${req.status}, alerts=${existingAlerts?.length ?? 0}).`);
    return {
      triggered: true,
      reqId,
      alreadyMobilized: true,
      unitsTargeted: unitsRemaining,
      unitsRemaining,
      reason: `Donor tier already activated for requisition ${reqId} (status: ${req.status})`,
      communitiesAlerted: (existingAlerts ?? []).map((a) => ({
        communityId: a.communityId,
        name: a.communityId,
        eligibleCount: a.eligibleMatchingCount ?? 0,
        score: a.score ?? 1.0,
        rank: a.rank ?? 1,
      })),
    };
  }

  // Fetch requesting hospital location
  const hospitalId = req.facilityId || req.hospitalId;
  const hospKeys = facilityKey(hospitalId);
  const hospital = await getItem<Facility & WithKeys<Facility>>(hospKeys.PK, hospKeys.SK);
  const hospLat = hospital?.lat ?? 11.0168;
  const hospLng = hospital?.lng ?? 76.9558;
  const hospName = hospital?.name ?? "Requesting Regional Hospital";

  const now = new Date();
  const nowIso = now.toISOString();

  // 2. Determine compatible blood groups using shared compatibility engine
  const compatibleGroups = BLOOD_GROUPS.filter((g) =>
    isUsable(getCompatibility(req.component, g, req.bloodGroup).level)
  );

  // 3. Query eligible donors across compatible groups via GSI1
  const eligibleDonorsByCommunity: Record<
    string,
    {
      donors: Donor[];
      bestCompat: CompatibilityLevel;
    }
  > = {};

  for (const group of compatibleGroups) {
    const level = getCompatibility(req.component, group, req.bloodGroup).level;
    const donors = await queryAll<Donor & WithKeys<Donor>>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk",
      values: {
        ":pk": `DONORS#${group}`,
      },
    });

    for (const d of donors) {
      if (!d.communityId) continue; // Community network tier only alerts registered communities
      const elig = computeEligibility(d, now);
      if (!elig.isEligible) continue; // Filter out deferred or mid-interval donors

      if (!eligibleDonorsByCommunity[d.communityId]) {
        eligibleDonorsByCommunity[d.communityId] = {
          donors: [],
          bestCompat: level,
        };
      }
      eligibleDonorsByCommunity[d.communityId].donors.push(d);

      // Keep best compatibility level for community
      if (level === "IDENTICAL") {
        eligibleDonorsByCommunity[d.communityId].bestCompat = "IDENTICAL";
      }
    }
  }

  const communityIds = Object.keys(eligibleDonorsByCommunity);
  if (communityIds.length === 0) {
    // If no eligible community donors found matching, mark EXHAUSTED
    await putItem({
      ...req,
      status: "EXHAUSTED",
      unitsRemaining,
      updatedAt: nowIso,
    });
    await writeAuditEvent({
      eventType: "REQUISITION_EXHAUSTED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        reqId,
        unitsRequested: req.unitsRequested,
        unitsRemaining,
        reason: "No eligible community donors found matching compatible groups",
      },
    });

    return {
      triggered: true,
      reqId,
      unitsTargeted: unitsRemaining,
      unitsRemaining,
      reason: "No eligible community donors found matching compatible groups",
      communitiesAlerted: [],
    };
  }

  // 4. Score each community with shared scoring engine weights
  // Score = 0.25*compat + 0.25*dist + 0.25*openReq + 0.15*size + 0.10*urgency
  interface ScoredCommunity {
    community: Community;
    eligibleCount: number;
    distanceKm: number;
    compatLevel: CompatibilityLevel;
    score: number;
    reason: string;
  }

  const scoredCommunities: ScoredCommunity[] = [];

  for (const cid of communityIds) {
    const cKeys = communityKey(cid);
    const comm = await getItem<Community & WithKeys<Community>>(cKeys.PK, cKeys.SK);
    if (!comm) continue;

    const data = eligibleDonorsByCommunity[cid];
    const eligibleCount = data.donors.length;
    const distanceKm = haversineKm(hospLat, hospLng, comm.lat, comm.lng);
    const compatLevel = data.bestCompat;

    const compatScore = compatLevel === "IDENTICAL" ? 1.0 : compatLevel === "COMPATIBLE" ? 0.75 : 0.5;
    const distFactor = Math.max(0, 1 - distanceKm / 50);
    const openReqScore = 1.0;
    // Normalization: size capped at 15 to ensure nearby small communities aren't dominated by distant large ones
    const sizeScore = Math.min(1.0, eligibleCount / 15);
    const urgencyScore = req.urgency === "CRITICAL" ? 1.0 : req.urgency === "HIGH" ? 0.6 : 0.2;

    const finalScore =
      0.25 * compatScore +
      0.25 * distFactor +
      0.25 * openReqScore +
      0.15 * sizeScore +
      0.10 * urgencyScore;

    const roundedScore = Math.round(finalScore * 1000) / 1000;

    const reason = `Ranked for ${compatLevel === "IDENTICAL" ? "exact match" : "compatible"} donors in proximity (${distanceKm.toFixed(1)} km) with ${eligibleCount} eligible member${eligibleCount === 1 ? "" : "s"} ready.`;

    scoredCommunities.push({
      community: comm,
      eligibleCount,
      distanceKm,
      compatLevel,
      score: roundedScore,
      reason,
    });
  }

  // Sort descending by score
  scoredCommunities.sort((a, b) => b.score - a.score);

  // Take top 3 communities
  const topCommunities = scoredCommunities.slice(0, 3);
  const alertedResults: DonorTierOutput["communitiesAlerted"] = [];

  for (let i = 0; i < topCommunities.length; i++) {
    const item = topCommunities[i];
    const rank = i + 1;
    const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

    const alert: CommunityAlert = {
      alertId,
      communityId: item.community.communityId,
      reqId,
      hospitalId,
      hospitalName: hospName,
      component: req.component,
      bloodGroup: req.bloodGroup,
      unitsNeeded: unitsRemaining, // ONLY the remaining need!
      urgency: req.urgency,
      neededBy: req.requiredBy || req.neededBy,
      eligibleMatchingCount: item.eligibleCount, // Count only, NO donor names
      score: item.score,
      rank,
      reason: item.reason,
      status: "OPEN",
      createdAt: nowIso,
    };

    const alertKeys = communityAlertKey(alert.communityId, alert.alertId);
    const agsi1 = communityAlertGsi1(alert.status, alert.createdAt);
    const agsi2 = communityAlertGsi2(reqId, rank);

    await putItem({
      ...alertKeys,
      ...agsi1,
      ...agsi2,
      entityType: "CommunityAlert",
      ...alert,
    });

    alertedResults.push({
      communityId: item.community.communityId,
      name: item.community.name,
      eligibleCount: item.eligibleCount,
      score: item.score,
      rank,
    });
  }

  // 5. Update Requisition status to DONOR_MOBILIZING
  await putItem({
    ...req,
    status: "DONOR_MOBILIZING",
    unitsRemaining,
    donorEscalationStartedAt: nowIso,
    updatedAt: nowIso,
  });

  // 6. Write DONOR_TIER_TRIGGERED audit event
  await writeAuditEvent({
    eventType: "DONOR_TIER_TRIGGERED",
    subjectType: "REQUISITION",
    subjectId: reqId,
    actorFacilityId: hospitalId,
    details: {
      reqId,
      bloodGroup: req.bloodGroup,
      component: req.component,
      unitsRequested: req.unitsRequested,
      unitsFulfilled,
      unitsRemaining,
      communitiesCount: alertedResults.length,
      communitiesAlerted: alertedResults.map((c) => ({
        communityId: c.communityId,
        name: c.name,
        count: c.eligibleCount,
        rank: c.rank,
      })),
      triggeredAt: nowIso,
    },
  });

  return {
    triggered: true,
    reqId,
    unitsTargeted: unitsRemaining,
    unitsRemaining,
    communitiesAlerted: alertedResults,
  };
}
