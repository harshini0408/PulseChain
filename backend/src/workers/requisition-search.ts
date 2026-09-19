/**
 * backend/src/workers/requisition-search.ts
 *
 * Network inventory search and atomic unit reservation for hospital requisition escalation.
 * Compatible surplus units are atomically reserved using TransactWriteItems.
 */

import {
  isoNow,
  unitKey,
  requisitionKey,
  getCompatibility,
  isUsable,
  type Component,
  type BloodGroup,
  type BloodUnit,
  type Requisition,
  type RequisitionStatus,
} from "@pulsechain/shared";
import { queryAll, getItem, transact, type TransactItem } from "../lib/db.js";
import { buildAuditTransactItem } from "../lib/audit.js";

export interface RequisitionSearchParams {
  requisitionId?: string;
  reqId?: string;
  facilityId?: string;
  hospitalId?: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  now?: string;
}

export interface RequisitionSearchResult {
  requisitionId: string;
  reqId: string;
  facilityId: string;
  hospitalId: string;
  component: Component;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  originalUnitsRequested: number;
  unitsFilled: number;
  filled: boolean;
  status: RequisitionStatus;
  availableCount: number;
  reservedUnitIds: string[];
}

export async function searchRequisitionInventory(
  params: RequisitionSearchParams,
): Promise<RequisitionSearchResult> {
  const reqId = params.requisitionId ?? params.reqId;
  const hospitalId = params.facilityId ?? params.hospitalId;
  const ts = params.now ?? isoNow();

  if (!reqId || !hospitalId) {
    throw new Error(
      `[requisition-search] Missing requisitionId or hospitalId in params: ${JSON.stringify(params)}`,
    );
  }

  // 1. Fetch the requisition to check its current filled count
  const existingReq = await getItem<Requisition>(`REQ#${reqId}`, "META");
  let currentUnitsFilled = existingReq?.unitsFilled ?? 0;

  // If already completely filled, short-circuit
  if (currentUnitsFilled >= params.unitsRequested) {
    return {
      requisitionId: reqId,
      reqId,
      facilityId: hospitalId,
      hospitalId,
      component: params.component,
      bloodGroup: params.bloodGroup,
      unitsRequested: 0,
      originalUnitsRequested: params.unitsRequested,
      unitsFilled: currentUnitsFilled,
      filled: true,
      status: "FILLED",
      availableCount: 0,
      reservedUnitIds: [],
    };
  }

  // 2. Query available units for this component from GSI1
  const hits = await queryAll<BloodUnit & { GSI1PK: string; GSI1SK: string }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": `QUEUE#AVAILABLE#${params.component}`,
    },
  });

  // 3. Filter for AVAILABLE units compatible with the requisition's blood group
  const matching = hits.filter((u) => {
    if (u.status !== "AVAILABLE") return false;
    const compat = getCompatibility(params.component, u.bloodGroup, params.bloodGroup);
    return isUsable(compat.level);
  });

  // 4. Sort matching units: IDENTICAL blood group first, then earliest expiry
  matching.sort((a, b) => {
    const compatA = getCompatibility(params.component, a.bloodGroup, params.bloodGroup).level;
    const compatB = getCompatibility(params.component, b.bloodGroup, params.bloodGroup).level;
    if (compatA === "IDENTICAL" && compatB !== "IDENTICAL") return -1;
    if (compatB === "IDENTICAL" && compatA !== "IDENTICAL") return 1;
    return a.expiresAt.localeCompare(b.expiresAt);
  });

  // 5. Reserve up to unitsRequested units atomically via TransactWriteItems
  const reservedUnitIds: string[] = [];

  for (const unit of matching) {
    if (currentUnitsFilled >= params.unitsRequested) break;

    const isFinalUnit = currentUnitsFilled + 1 >= params.unitsRequested;
    const newReqStatus: RequisitionStatus = isFinalUnit ? "FILLED" : "PARTIAL";

    // Unit conditional update: AVAILABLE -> CLAIMED
    const unitUpdate: TransactItem = {
      Update: {
        Key: unitKey(unit.unitId),
        UpdateExpression:
          "SET #status = :newStatus, claimedBy = :claimedBy, claimedAt = :ts, version = version + :inc REMOVE GSI1PK, GSI1SK",
        ConditionExpression: "#status = :expectedStatus",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":expectedStatus": "AVAILABLE",
          ":newStatus": "CLAIMED",
          ":claimedBy": hospitalId,
          ":ts": ts,
          ":inc": 1,
        },
      },
    };

    // Requisition conditional update: increment unitsFilled, update status (and remove GSI1 if filled)
    const reqUpdate: TransactItem = {
      Update: {
        Key: requisitionKey(reqId),
        UpdateExpression: isFinalUnit
          ? "SET unitsFilled = unitsFilled + :one, #status = :newStatus REMOVE GSI1PK, GSI1SK"
          : "SET unitsFilled = unitsFilled + :one, #status = :newStatus",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":newStatus": newReqStatus,
        },
      },
    };

    // Audit event for unit claimed
    const { transactItem: unitAuditItem } = buildAuditTransactItem({
      eventType: "OFFER_CLAIMED",
      subjectType: "UNIT",
      subjectId: unit.unitId,
      actorFacilityId: hospitalId,
      timestamp: ts,
      details: {
        claimedBy: hospitalId,
        requisitionId: reqId,
        component: params.component,
        bloodGroup: unit.bloodGroup,
        claimedAt: ts,
        type: "REQUISITION_RESERVATION",
      },
    });

    const transactItems: TransactItem[] = [unitUpdate, reqUpdate, unitAuditItem];

    // If this unit fills the requisition, add REQUISITION_FILLED audit event atomically
    if (isFinalUnit) {
      const { transactItem: reqFilledAuditItem } = buildAuditTransactItem({
        eventType: "REQUISITION_FILLED",
        subjectType: "REQUISITION",
        subjectId: reqId,
        actorFacilityId: hospitalId,
        timestamp: ts,
        details: {
          component: params.component,
          bloodGroup: params.bloodGroup,
          unitsRequested: params.unitsRequested,
          unitsFilled: currentUnitsFilled + 1,
          filledAt: ts,
        },
      });
      transactItems.push(reqFilledAuditItem);
    }

    try {
      await transact(transactItems);
      currentUnitsFilled += 1;
      reservedUnitIds.push(unit.unitId);
    } catch (err: any) {
      if (
        err.name === "TransactionCanceledException" ||
        err.message?.includes("ConditionalCheckFailed")
      ) {
        // Unit was claimed concurrently; continue to next candidate
        console.warn(
          `[requisition-search] Unit ${unit.unitId} could not be reserved (concurrent check failed). Trying next.`,
        );
        continue;
      }
      throw err;
    }
  }

  const isFilled = currentUnitsFilled >= params.unitsRequested;
  const finalStatus: RequisitionStatus = isFilled
    ? "FILLED"
    : currentUnitsFilled > 0
      ? "PARTIAL"
      : "OPEN";

  const shortfall = Math.max(0, params.unitsRequested - currentUnitsFilled);

  return {
    requisitionId: reqId,
    reqId,
    facilityId: hospitalId,
    hospitalId,
    component: params.component,
    bloodGroup: params.bloodGroup,
    unitsRequested: shortfall, // Shortfall continues to donor tier as unitsRequested
    originalUnitsRequested: params.unitsRequested,
    unitsFilled: currentUnitsFilled,
    filled: isFilled,
    status: finalStatus,
    availableCount: matching.length,
    reservedUnitIds,
  };
}

export async function handler(event: RequisitionSearchParams) {
  return await searchRequisitionInventory(event);
}
