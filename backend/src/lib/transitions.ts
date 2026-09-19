/**
 * backend/src/lib/transitions.ts
 *
 * The state transition chokepoint.
 * Every status change happens via an exported function in this module,
 * building a TransactWriteItems containing the entity update and its audit row.
 *
 * GSI sparse index rules:
 * - When entering QUEUE#AVAILABLE or QUEUE#RESCUE_PENDING: GSI1 attributes set.
 * - When leaving queue (CLAIMED, LOST, etc.): GSI1 attributes REMOVED.
 * - When transferring to new facility: GSI2PK updated to new facility stock.
 */

import {
  unitKey,
  unitStockGsi2,
  queuePartition,
  isoNow,
  type Component,
  type UnitStatus,
  type OfferStatus,
  type BloodUnit,
} from "@pulsechain/shared";
import { getItem, transact, type TransactItem } from "./db.js";
import { buildAuditTransactItem } from "./audit.js";

// ---------------------------------------------------------------------------
// Unit transitions
// ---------------------------------------------------------------------------

/**
 * AVAILABLE → RESCUE_PENDING
 * Triggered when a unit crosses the expiry threshold during sweep.
 */
export async function transitionAvailableToRescuePending(params: {
  unitId: string;
  component: Component;
  expiresAt: string;
  escalationId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);
  const newGsi1pk = queuePartition("RESCUE_PENDING", params.component);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "THRESHOLD_CROSSED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: {
      fromStatus: "AVAILABLE",
      toStatus: "RESCUE_PENDING",
      escalationId: params.escalationId,
      expiresAt: params.expiresAt,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, activeEscalationId = :escId, GSI1PK = :newGsi1pk, version = version + :inc",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "AVAILABLE" satisfies UnitStatus,
        ":newStatus": "RESCUE_PENDING" satisfies UnitStatus,
        ":escId": params.escalationId,
        ":newGsi1pk": newGsi1pk,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * AVAILABLE → RESERVED
 * Atomically reserves an available blood unit for a hospital requisition.
 * Removes unit from sparse GSI1 queue (QUEUE#AVAILABLE#...) to prevent double-allocation.
 */
export async function transitionAvailableToReserved(params: {
  unitId: string;
  requisitionId: string;
  reservedByFacilityId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "UNIT_RESERVED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? params.reservedByFacilityId,
    timestamp: ts,
    details: {
      fromStatus: "AVAILABLE",
      toStatus: "RESERVED",
      requisitionId: params.requisitionId,
      reservedByFacilityId: params.reservedByFacilityId,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, reservedForRequisitionId = :reqId, reservedByFacilityId = :facId, reservedAt = :ts, version = if_not_exists(version, :zero) + :inc REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :expectedStatus AND attribute_not_exists(reservedForRequisitionId)",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "AVAILABLE" satisfies UnitStatus,
        ":newStatus": "RESERVED" satisfies UnitStatus,
        ":reqId": params.requisitionId,
        ":facId": params.reservedByFacilityId,
        ":ts": ts,
        ":inc": 1,
        ":zero": 0,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * RESERVED → AVAILABLE
 * Reverses a reservation when a requisition is cancelled or reservation is abandoned.
 * Restores unit to sparse GSI1 queue (QUEUE#AVAILABLE#<component>) so it re-enters regional supply.
 * Verifies unit is currently RESERVED and was reserved specifically for the given requisition.
 */
export async function transitionReservedToAvailable(params: {
  unitId: string;
  requisitionId: string;
  actorFacilityId?: string | null;
  reason?: string;
  timestamp?: string;
}): Promise<boolean> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  // Fetch unit to retrieve component and expiresAt to rebuild GSI1 keys
  const unit = await getItem<BloodUnit>(key.PK, key.SK);
  if (!unit) {
    throw new Error(`Unit ${params.unitId} not found`);
  }

  // Safety checks: must be RESERVED and reserved for THIS requisition
  if (unit.status !== "RESERVED" || unit.reservedForRequisitionId !== params.requisitionId) {
    // If unit has progressed (e.g. IN_TRANSIT, RECEIVED, CLAIMED) or belongs to another requisition, DO NOT rollback
    return false;
  }

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "UNIT_RESERVATION_RELEASED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? unit.facilityId,
    timestamp: ts,
    details: {
      fromStatus: "RESERVED",
      toStatus: "AVAILABLE",
      requisitionId: params.requisitionId,
      reason: params.reason ?? "Requisition cancelled",
      releasedAt: ts,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk, version = if_not_exists(version, :zero) + :inc REMOVE reservedForRequisitionId, reservedByFacilityId, reservedAt",
      ConditionExpression:
        "#status = :expectedStatus AND reservedForRequisitionId = :reqId",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "RESERVED" satisfies UnitStatus,
        ":newStatus": "AVAILABLE" satisfies UnitStatus,
        ":reqId": params.requisitionId,
        ":gsi1pk": `QUEUE#AVAILABLE#${unit.component}`,
        ":gsi1sk": `${unit.expiresAt}#${unit.unitId}`,
        ":inc": 1,
        ":zero": 0,
      },
    },
  };

  try {
    await transact([unitUpdate, auditItem]);
    return true;
  } catch (err: any) {
    console.warn(`[transitions] Failed to release reservation for unit ${params.unitId}:`, err.message);
    return false;
  }
}

/**
 * RESCUE_PENDING → CLAIMED
 * Executed as part of the atomic claim transaction (see executeClaimTransaction below).
 */
export async function transitionRescuePendingToClaimed(params: {
  unitId: string;
  claimedByFacilityId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "OFFER_CLAIMED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? params.claimedByFacilityId,
    timestamp: ts,
    details: {
      claimedBy: params.claimedByFacilityId,
      claimedAt: ts,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, claimedBy = :claimedBy, claimedAt = :ts, version = version + :inc REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "RESCUE_PENDING" satisfies UnitStatus,
        ":newStatus": "CLAIMED" satisfies UnitStatus,
        ":claimedBy": params.claimedByFacilityId,
        ":ts": ts,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * RESCUE_PENDING → LOST
 * Triggered by lost-check worker when true expiresAt has passed without being claimed.
 */
export async function transitionRescuePendingToLost(params: {
  unitId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "UNIT_LOST",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: {
      fromStatus: "RESCUE_PENDING",
      toStatus: "LOST",
      lostAt: ts,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, lostAt = :ts, version = version + :inc REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "RESCUE_PENDING" satisfies UnitStatus,
        ":newStatus": "LOST" satisfies UnitStatus,
        ":ts": ts,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * AVAILABLE → LOST
 * Fallback transition if a unit expired before ever being swept.
 */
export async function transitionAvailableToLost(params: {
  unitId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "UNIT_LOST",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: {
      fromStatus: "AVAILABLE",
      toStatus: "LOST",
      lostAt: ts,
      reason: "Expired before sweep",
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, lostAt = :ts, version = version + :inc REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "AVAILABLE" satisfies UnitStatus,
        ":newStatus": "LOST" satisfies UnitStatus,
        ":ts": ts,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * CLAIMED → IN_TRANSIT
 * Triggered by courier dispatch / transfer in-transit route.
 */
export async function transitionClaimedToInTransit(params: {
  unitId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "TRANSFER_IN_TRANSIT",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: {
      fromStatus: "CLAIMED",
      toStatus: "IN_TRANSIT",
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression: "SET #status = :newStatus, version = version + :inc",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "CLAIMED" satisfies UnitStatus,
        ":newStatus": "IN_TRANSIT" satisfies UnitStatus,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

/**
 * IN_TRANSIT → RECEIVED
 * Receiving hospital confirms receipt; unit facility and GSI2 stock update to recipient.
 */
export async function transitionInTransitToReceived(params: {
  unitId: string;
  recipientFacilityId: string;
  expiresAt: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const key = unitKey(params.unitId);
  const stockGsi2 = unitStockGsi2(params.recipientFacilityId, params.expiresAt, params.unitId);

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "TRANSFER_RECEIVED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? params.recipientFacilityId,
    timestamp: ts,
    details: {
      fromStatus: "IN_TRANSIT",
      toStatus: "RECEIVED",
      receivedAt: ts,
      newFacilityId: params.recipientFacilityId,
    },
  });

  const unitUpdate: TransactItem = {
    Update: {
      Key: key,
      UpdateExpression:
        "SET #status = :newStatus, facilityId = :newFac, receivedAt = :ts, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk, version = version + :inc",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "IN_TRANSIT" satisfies UnitStatus,
        ":newStatus": "RECEIVED" satisfies UnitStatus,
        ":newFac": params.recipientFacilityId,
        ":ts": ts,
        ":gsi2pk": stockGsi2.GSI2PK,
        ":gsi2sk": stockGsi2.GSI2SK,
        ":inc": 1,
      },
    },
  };

  await transact([unitUpdate, auditItem]);
}

// ---------------------------------------------------------------------------
// Offer transitions
// ---------------------------------------------------------------------------

/**
 * OPEN → DECLINED
 */
export async function transitionOfferOpenToDeclined(params: {
  unitId: string;
  offerSk: string;
  offerId: string;
  reason?: string;
  actorFacilityId?: string | null;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "OFFER_DECLINED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: {
      offerId: params.offerId,
      reason: params.reason ?? "Declined by hospital",
    },
  });

  const offerUpdate: TransactItem = {
    Update: {
      Key: { PK: `UNIT#${params.unitId}`, SK: params.offerSk },
      UpdateExpression: "SET #status = :newStatus, respondedAt = :ts",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "OPEN" satisfies OfferStatus,
        ":newStatus": "DECLINED" satisfies OfferStatus,
        ":ts": ts,
      },
    },
  };

  await transact([offerUpdate, auditItem]);
}

/**
 * OPEN → EXPIRED
 */
export async function transitionOfferOpenToExpired(params: {
  unitId: string;
  offerSk: string;
  offerId: string;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "OFFER_EXPIRED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: null,
    timestamp: ts,
    details: {
      offerId: params.offerId,
      expiredAt: ts,
    },
  });

  const offerUpdate: TransactItem = {
    Update: {
      Key: { PK: `UNIT#${params.unitId}`, SK: params.offerSk },
      UpdateExpression: "SET #status = :newStatus",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "OPEN" satisfies OfferStatus,
        ":newStatus": "EXPIRED" satisfies OfferStatus,
      },
    },
  };

  await transact([offerUpdate, auditItem]);
}

/**
 * OPEN → SUPERSEDED
 * Called when another hospital claimed the unit.
 */
export async function transitionOfferOpenToSuperseded(params: {
  unitId: string;
  offerSk: string;
  offerId?: string;
  timestamp?: string;
}): Promise<void> {
  const ts = params.timestamp ?? isoNow();

  const offerUpdate: TransactItem = {
    Update: {
      Key: { PK: `UNIT#${params.unitId}`, SK: params.offerSk },
      UpdateExpression: "SET #status = :newStatus",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "OPEN" satisfies OfferStatus,
        ":newStatus": "SUPERSEDED" satisfies OfferStatus,
      },
    },
  };

  const { transactItem: auditItem } = buildAuditTransactItem({
    eventType: "OFFER_SUPERSEDED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: null,
    timestamp: ts,
    details: {
      offerSk: params.offerSk,
      offerId: params.offerId,
      reason: "Unit claimed by another facility",
    },
  });

  await transact([offerUpdate, auditItem]);
}

// ---------------------------------------------------------------------------
// The Atomic Claim Transaction
// ---------------------------------------------------------------------------

export interface ClaimTransactionParams {
  unitId: string;
  offerSk: string;
  offerId: string;
  recipientFacilityId: string;
  claimBy: string;
  timestamp?: string;
}

/**
 * Executes the atomic 3-item claim transaction:
 * 1. Unit: RESCUE_PENDING → CLAIMED, removes GSI1, condition status = RESCUE_PENDING
 * 2. Offer: OPEN → CLAIMED, condition status = OPEN AND claimBy > now
 * 3. Audit: Put OFFER_CLAIMED
 */
export async function executeClaimTransaction(
  params: ClaimTransactionParams,
): Promise<void> {
  const ts = params.timestamp ?? isoNow();
  const unitKeyObj = unitKey(params.unitId);

  // 1. Audit event: OFFER_CLAIMED
  const { transactItem: auditTransactItem } = buildAuditTransactItem({
    eventType: "OFFER_CLAIMED",
    subjectType: "UNIT",
    subjectId: params.unitId,
    actorFacilityId: params.recipientFacilityId,
    timestamp: ts,
    details: {
      offerId: params.offerId,
      claimedBy: params.recipientFacilityId,
      claimedAt: ts,
    },
  });

  // 2. Unit update
  const unitUpdate: TransactItem = {
    Update: {
      Key: unitKeyObj,
      UpdateExpression:
        "SET #status = :claimedStatus, claimedBy = :claimedBy, claimedAt = :ts, version = version + :inc REMOVE GSI1PK, GSI1SK",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedStatus": "RESCUE_PENDING" satisfies UnitStatus,
        ":claimedStatus": "CLAIMED" satisfies UnitStatus,
        ":claimedBy": params.recipientFacilityId,
        ":ts": ts,
        ":inc": 1,
      },
    },
  };

  // 3. Offer update
  const offerUpdate: TransactItem = {
    Update: {
      Key: { PK: `UNIT#${params.unitId}`, SK: params.offerSk },
      UpdateExpression: "SET #status = :claimedStatus, respondedAt = :ts",
      ConditionExpression: "#status = :expectedOfferStatus AND claimBy > :now",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":expectedOfferStatus": "OPEN" satisfies OfferStatus,
        ":claimedStatus": "CLAIMED" satisfies OfferStatus,
        ":ts": ts,
        ":now": ts,
      },
    },
  };

  await transact([unitUpdate, offerUpdate, auditTransactItem]);
}
