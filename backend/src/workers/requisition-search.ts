/**
 * backend/src/workers/requisition-search.ts
 *
 * Intelligent Requisition Fulfilment Engine:
 * 1. Checks requisition deadline (requiredBy/neededBy). If passed, transitions to EXPIRED.
 * 2. Checks current status. If CANCELLED or already FULFILLED, exits safely.
 * 3. Transitions status to SEARCHING_INVENTORY (audit REQUISITION_SEARCH_STARTED).
 * 4. Queries regional banked inventory on GSI1 (QUEUE#AVAILABLE#<component>).
 * 5. Filters using shared clinical compatibility (shared/src/compatibility.ts):
 *    - Rejects INCOMPATIBLE units.
 *    - Ignores claimed, lost, expired, or already reserved units.
 * 6. Deterministically scores and ranks candidates:
 *    - Compatibility level (IDENTICAL > COMPATIBLE > ACCEPTABLE).
 *    - Geographic distance to requesting facility.
 *    - Near-expiry preference to minimize avoidable wastage.
 * 7. Atomically reserves candidate units across blood centres up to unitsRemaining.
 *    - Concurrency-safe: conditional write removes unit from sparse GSI1 queue.
 *    - If a candidate race is lost, worker safely logs rejection and tries next candidate.
 * 8. Evaluates fulfillment:
 *    - unitsFulfilled == unitsRequested: transitions to FULFILLED (audit REQUISITION_FULFILLED).
 *    - unitsFulfilled > 0: transitions to PARTIALLY_FULFILLED (audit REQUISITION_PARTIALLY_FULFILLED).
 *    - unitsFulfilled == 0: transitions to DONOR_ESCALATION (audit DONOR_ESCALATION_STARTED).
 * 9. Returns structured payload for Step Function Choice state evaluation.
 */

import {
  getCompatibility,
  isUsable,
  isoNow,
  hoursBetween,
  queuePartition,
  requisitionKey,
  facilityKey,
  type BloodGroup,
  type BloodUnit,
  type Component,
  type CompatibilityLevel,
  type Facility,
  type Requisition,
  type WithKeys,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";
import { transitionAvailableToReserved } from "../lib/transitions.js";

export interface RequisitionSearchParams {
  requisitionId: string;
  reqId?: string;
  facilityId?: string;
  hospitalId?: string;
  component?: Component;
  bloodGroup?: BloodGroup;
  unitsRequested?: number;
  urgency?: string;
  requiredBy?: string;
  neededBy?: string;
}

export interface RequisitionSearchResult {
  requisitionId: string;
  reqId: string;
  facilityId: string;
  hospitalId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  unitsFulfilled: number;
  unitsRemaining: number;
  status: string;
  filled: boolean;
  partial: boolean;
  reservedUnitIds: string[];
  candidateCount?: number;
  error?: string;
  cancelled?: boolean;
  expired?: boolean;
}

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

export async function searchRequisitionInventory(
  params: RequisitionSearchParams
): Promise<RequisitionSearchResult> {
  const reqId = params.requisitionId || params.reqId;
  if (!reqId) {
    throw new Error("[requisition-search] Missing requisition ID");
  }

  const now = isoNow();
  const reqKeys = requisitionKey(reqId);
  const req = await getItem<WithKeys<Requisition> & Requisition>(reqKeys.PK, reqKeys.SK);

  if (!req) {
    throw new Error(`[requisition-search] Requisition ${reqId} not found in database`);
  }

  const hospitalId = req.facilityId || req.hospitalId;
  const unitsRequested = req.unitsRequested;
  let unitsFulfilled = req.unitsFulfilled ?? req.unitsFilled ?? 0;
  const reservedUnitIds: string[] = req.reservedUnitIds ? [...req.reservedUnitIds] : [];
  let unitsRemaining = Math.max(0, unitsRequested - unitsFulfilled);

  // 1. Guard against terminal or inactive states
  if (req.status === "FULFILLED" || req.status === "FILLED" || unitsRemaining === 0) {
    return {
      requisitionId: reqId,
      reqId,
      facilityId: hospitalId,
      hospitalId,
      component: req.component,
      bloodGroup: req.bloodGroup,
      unitsRequested,
      unitsFulfilled,
      unitsRemaining: 0,
      status: req.status,
      filled: true,
      partial: false,
      reservedUnitIds,
    };
  }

  if (req.status === "CANCELLED" || req.status === "CLOSED") {
    return {
      requisitionId: reqId,
      reqId,
      facilityId: hospitalId,
      hospitalId,
      component: req.component,
      bloodGroup: req.bloodGroup,
      unitsRequested,
      unitsFulfilled,
      unitsRemaining,
      status: req.status,
      filled: false,
      partial: unitsFulfilled > 0,
      cancelled: true,
      reservedUnitIds,
    };
  }

  // 2. Check Requisition requiredBy deadline
  const deadlineStr = req.requiredBy || req.neededBy;
  if (deadlineStr && new Date(deadlineStr).getTime() <= Date.now()) {
    console.warn(`[requisition-search] Requisition ${reqId} deadline ${deadlineStr} has expired.`);
    await putItem({
      ...req,
      status: "EXPIRED",
      updatedAt: now,
    });
    await writeAuditEvent({
      eventType: "REQUISITION_EXHAUSTED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        reason: "Requisition deadline expired before fulfillment could complete",
        requiredBy: deadlineStr,
      },
    });
    return {
      requisitionId: reqId,
      reqId,
      facilityId: hospitalId,
      hospitalId,
      component: req.component,
      bloodGroup: req.bloodGroup,
      unitsRequested,
      unitsFulfilled,
      unitsRemaining,
      status: "EXPIRED",
      filled: false,
      partial: unitsFulfilled > 0,
      expired: true,
      reservedUnitIds,
    };
  }

  // 3. Mark SEARCHING_INVENTORY
  await putItem({
    ...req,
    status: "SEARCHING_INVENTORY",
    lastSearchAt: now,
    updatedAt: now,
  });

  await writeAuditEvent({
    eventType: "REQUISITION_SEARCH_STARTED",
    subjectType: "REQUISITION",
    subjectId: reqId,
    actorFacilityId: hospitalId,
    details: {
      requisitionId: reqId,
      hospitalId,
      component: req.component,
      bloodGroup: req.bloodGroup,
      unitsRequested,
      unitsRemaining,
    },
  });

  // 4. Fetch requesting hospital location for distance calculation
  const hospKeys = facilityKey(hospitalId);
  const hospital = await getItem<Facility & WithKeys<Facility>>(hospKeys.PK, hospKeys.SK);
  const hospLat = hospital?.lat ?? 11.0168;
  const hospLng = hospital?.lng ?? 76.9558;

  // 5. Query Banked Available Inventory for requested component
  const availableUnits = await queryAll<BloodUnit & WithKeys<BloodUnit>>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": queuePartition("AVAILABLE", req.component),
    },
  });

  // Cache facility coordinates to minimize repeated lookups
  const facilityCache = new Map<string, { lat: number; lng: number }>();
  if (hospital) {
    facilityCache.set(hospitalId, { lat: hospLat, lng: hospLng });
  }

  // 6. Filter and Score Candidate Units
  interface RankedCandidate {
    unit: BloodUnit & WithKeys<BloodUnit>;
    compatLevel: CompatibilityLevel;
    distanceKm: number;
    hoursToExpiry: number;
    score: number;
  }

  const candidates: RankedCandidate[] = [];

  for (const u of availableUnits) {
    // Only available units that are not expired and not claimed/reserved
    if (u.status !== "AVAILABLE") continue;
    if (new Date(u.expiresAt).getTime() <= Date.now()) continue;
    if (u.claimedBy || u.reservedForRequisitionId) continue;
    if (reservedUnitIds.includes(u.unitId)) continue; // Already reserved by this requisition

    // Component-aware clinical compatibility
    const compat = getCompatibility(req.component, u.bloodGroup, req.bloodGroup);
    if (!isUsable(compat.level)) continue;

    // Determine geographic distance
    let distanceKm = 0;
    if (u.facilityId !== hospitalId) {
      let coords = facilityCache.get(u.facilityId);
      if (!coords) {
        const fac = await getItem<Facility & WithKeys<Facility>>(
          facilityKey(u.facilityId).PK,
          facilityKey(u.facilityId).SK
        );
        coords = fac ? { lat: fac.lat, lng: fac.lng } : { lat: hospLat, lng: hospLng };
        facilityCache.set(u.facilityId, coords);
      }
      distanceKm = haversineKm(hospLat, hospLng, coords.lat, coords.lng);
    }

    const hoursToExpiry = Math.max(0, hoursBetween(now, u.expiresAt));

    // Compatibility sub-score: IDENTICAL > COMPATIBLE > ACCEPTABLE
    const compatSubScore =
      compat.level === "IDENTICAL" ? 1.0 : compat.level === "COMPATIBLE" ? 0.75 : 0.4;

    // Distance sub-score (closer is preferred for transport safety)
    const distSubScore = Math.max(0, 1 - distanceKm / 60);

    // Near-expiry preference: prioritize units expiring sooner to rescue from wastage
    // capped at 120 hours
    const expirySubScore = Math.max(0, 1 - Math.min(hoursToExpiry, 120) / 120);

    // Composite deterministic score
    const score = 0.5 * compatSubScore + 0.3 * distSubScore + 0.2 * expirySubScore;

    candidates.push({
      unit: u,
      compatLevel: compat.level,
      distanceKm,
      hoursToExpiry,
      score: Math.round(score * 1000) / 1000,
    });
  }

  // Sort candidates descending by score (with tie-break on sooner expiry)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.hoursToExpiry - b.hoursToExpiry;
  });

  console.log(
    `[requisition-search] Found ${candidates.length} compatible candidates for ${reqId} (${req.component} ${req.bloodGroup}). Target: ${unitsRemaining} units.`
  );

  // 7. Atomic Unit Reservation Loop
  for (const candidate of candidates) {
    if (unitsRemaining <= 0) break;

    // Check current requisition status before attempting reservation (protect against cancellation race)
    const latestReq = await getItem<WithKeys<Requisition> & Requisition>(reqKeys.PK, reqKeys.SK);
    if (!latestReq || latestReq.status === "CANCELLED" || latestReq.status === "CLOSED") {
      console.log(`[requisition-search] Requisition ${reqId} was cancelled during search loop. Aborting.`);
      break;
    }

    // Audit reservation attempt
    await writeAuditEvent({
      eventType: "UNIT_RESERVATION_ATTEMPTED",
      subjectType: "UNIT",
      subjectId: candidate.unit.unitId,
      actorFacilityId: hospitalId,
      details: {
        requisitionId: reqId,
        component: req.component,
        bloodGroup: candidate.unit.bloodGroup,
        recipientBloodGroup: req.bloodGroup,
        compatibilityLevel: candidate.compatLevel,
        distanceKm: candidate.distanceKm,
        score: candidate.score,
      },
    });

    try {
      await transitionAvailableToReserved({
        unitId: candidate.unit.unitId,
        requisitionId: reqId,
        reservedByFacilityId: hospitalId,
        actorFacilityId: hospitalId,
        timestamp: now,
      });

      unitsFulfilled += 1;
      unitsRemaining -= 1;
      reservedUnitIds.push(candidate.unit.unitId);
      console.log(
        `[requisition-search] Successfully reserved unit ${candidate.unit.unitId} (${candidate.compatLevel}) from ${candidate.unit.facilityId} for req ${reqId}.`
      );
    } catch (err: any) {
      const isConflict =
        err.name === "TransactionCanceledException" ||
        err.message?.includes("ConditionalCheckFailed");
      if (isConflict) {
        console.warn(
          `[requisition-search] Reservation conflict on unit ${candidate.unit.unitId}. Continuing to next candidate.`
        );
        await writeAuditEvent({
          eventType: "UNIT_RESERVATION_REJECTED",
          subjectType: "UNIT",
          subjectId: candidate.unit.unitId,
          actorFacilityId: hospitalId,
          details: {
            requisitionId: reqId,
            reason: "Unit reservation conditional check failed (already claimed or reserved)",
          },
        });
        continue;
      }
      throw err;
    }
  }

  // 8. Determine Final Status and Transitions
  let finalStatus: string;
  const isFullyFulfilled = unitsFulfilled >= unitsRequested;
  const isPartiallyFulfilled = unitsFulfilled > 0 && unitsFulfilled < unitsRequested;

  if (isFullyFulfilled) {
    finalStatus = "FULFILLED";
    await writeAuditEvent({
      eventType: "REQUISITION_FILLED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        requisitionId: reqId,
        unitsRequested,
        unitsFulfilled,
        reservedUnitIds,
      },
    });
    await writeAuditEvent({
      eventType: "REQUISITION_FULFILLED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        requisitionId: reqId,
        unitsRequested,
        unitsFulfilled,
        reservedUnitIds,
      },
    });
  } else if (isPartiallyFulfilled) {
    finalStatus = "PARTIALLY_FULFILLED";
    await writeAuditEvent({
      eventType: "REQUISITION_PARTIALLY_FULFILLED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        requisitionId: reqId,
        unitsRequested,
        unitsFulfilled,
        unitsRemaining,
        reservedUnitIds,
      },
    });
  } else {
    finalStatus = "DONOR_ESCALATION";
    await writeAuditEvent({
      eventType: "DONOR_ESCALATION_STARTED",
      subjectType: "REQUISITION",
      subjectId: reqId,
      actorFacilityId: hospitalId,
      details: {
        requisitionId: reqId,
        unitsRequested,
        unitsRemaining,
        reason: "Zero compatible institutional inventory found in regional network",
      },
    });
  }

  // Persist updated requisition state
  await putItem({
    ...req,
    status: finalStatus,
    unitsFulfilled,
    unitsFilled: unitsFulfilled,
    unitsRemaining,
    reservedUnitIds,
    lastSearchAt: now,
    updatedAt: now,
  });

  return {
    requisitionId: reqId,
    reqId,
    facilityId: hospitalId,
    hospitalId,
    component: req.component,
    bloodGroup: req.bloodGroup,
    unitsRequested,
    unitsFulfilled,
    unitsRemaining,
    status: finalStatus,
    filled: isFullyFulfilled,
    partial: isPartiallyFulfilled,
    reservedUnitIds,
    candidateCount: candidates.length,
  };
}

export async function handler(event: RequisitionSearchParams): Promise<RequisitionSearchResult> {
  return await searchRequisitionInventory(event);
}
