// Every PK/SK/GSI key builder — the ONLY place keys are constructed.
// Key formats verified character-for-character against infra/db/sample-items.json.

import { padDistance } from "./time.js";
import type { Component, UnitStatus, EscalationSubject, FacilityType } from "./enums.js";
import type { BloodGroup } from "./enums.js";

// ---------------------------------------------------------------------------
// Facility
// ---------------------------------------------------------------------------

/** PK + SK for a facility profile item */
export function facilityKey(facId: string) {
  return { PK: `FACILITY#${facId}`, SK: "PROFILE" } as const;
}

/** GSI1 keys for facility list (GSI1PK = "FACILITIES") */
export function facilityGsi1(type: FacilityType, facId: string) {
  return { GSI1PK: "FACILITIES", GSI1SK: `${type}#${facId}` } as const;
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

/** SK for a DIST item; PK is the origin facility key */
export function distanceSk(km: number, toFacId: string) {
  return `DIST#${padDistance(km)}#${toFacId}`;
}

/** Full PK + SK for a distance item */
export function distanceKey(fromFacId: string, km: number, toFacId: string) {
  return { PK: `FACILITY#${fromFacId}`, SK: distanceSk(km, toFacId) } as const;
}

/**
 * SK range for a ring query.
 * Ring boundaries use "~" so a facility at exactly minKm is NOT in the next ring:
 *   Ring 1: DIST#000.0  …  DIST#010.0~  (inclusive of 10.0)
 *   Ring 2: DIST#010.0~ …  DIST#030.0~  (exclusive of 10.0, inclusive of 30.0)
 *   Ring 3: DIST#030.0~ …  DIST#999.9~
 */
export function ringRange(minKm: number, maxKm: number) {
  const from = minKm === 0 ? `DIST#${padDistance(0)}` : `DIST#${padDistance(minKm)}~`;
  const to = `DIST#${padDistance(maxKm)}~`;
  return { from, to } as const;
}

// ---------------------------------------------------------------------------
// Standing demand
// ---------------------------------------------------------------------------

export function demandKey(facId: string, component: Component, group: BloodGroup) {
  return {
    PK: `FACILITY#${facId}`,
    SK: `DEMAND#${component}#${group}`,
  } as const;
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export function unitKey(unitId: string) {
  return { PK: `UNIT#${unitId}`, SK: "META" } as const;
}

/** GSI1 keys while unit is in a queue (AVAILABLE or RESCUE_PENDING) */
export function unitQueueGsi1(
  status: UnitStatus,
  component: Component,
  expiresAt: string,
  unitId: string,
) {
  return {
    GSI1PK: `QUEUE#${status}#${component}`,
    GSI1SK: `${expiresAt}#${unitId}`,
  } as const;
}

/** GSI2 keys for blood-centre stock console */
export function unitStockGsi2(facId: string, expiresAt: string, unitId: string) {
  return {
    GSI2PK: `FACILITY#${facId}#STOCK`,
    GSI2SK: `${expiresAt}#${unitId}`,
  } as const;
}

// ---------------------------------------------------------------------------
// Offer
// ---------------------------------------------------------------------------

export function offerKey(
  unitId: string,
  escId: string,
  ring: 1 | 2 | 3,
  recipientFacId: string,
) {
  return {
    PK: `UNIT#${unitId}`,
    SK: `OFFER#${escId}#R${ring}#${recipientFacId}`,
  } as const;
}

/** GSI2 keys for hospital offer inbox */
export function offerInboxGsi2(recipientFacId: string, createdAt: string) {
  return {
    GSI2PK: `FACILITY#${recipientFacId}#INBOX`,
    GSI2SK: createdAt,
  } as const;
}

// ---------------------------------------------------------------------------
// Escalation (both unit and requisition)
// ---------------------------------------------------------------------------

export function escalationKey(
  subjectType: EscalationSubject,
  subjectId: string,
  escId: string,
) {
  const pk = subjectType === "UNIT" ? `UNIT#${subjectId}` : `REQ#${subjectId}`;
  return { PK: pk, SK: `ESC#${escId}` } as const;
}

/** GSI1 for active escalation coordinator view */
export function activeEscalationGsi1(startedAt: string) {
  return { GSI1PK: "ESC#ACTIVE", GSI1SK: startedAt } as const;
}

// ---------------------------------------------------------------------------
// Requisition
// ---------------------------------------------------------------------------

export function requisitionKey(reqId: string) {
  return { PK: `REQ#${reqId}`, SK: "META" } as const;
}

/** GSI1 for open-requisition work queue */
export function openReqGsi1(
  component: Component,
  group: BloodGroup,
  neededBy: string,
) {
  return {
    GSI1PK: `OPENREQ#${component}`,
    GSI1SK: `${group}#${neededBy}`,
  } as const;
}

/** GSI2 for hospital's own requisitions view */
export function hospitalReqsGsi2(hospitalId: string, neededBy: string) {
  return {
    GSI2PK: `FACILITY#${hospitalId}#REQS`,
    GSI2SK: neededBy,
  } as const;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function auditKey(
  subjectType: EscalationSubject,
  subjectId: string,
  ts: string,
  eventId: string,
) {
  const pk = subjectType === "UNIT" ? `UNIT#${subjectId}` : `REQ#${subjectId}`;
  return { PK: pk, SK: `AUDIT#${ts}#${eventId}` } as const;
}

/** GSI1 for monthly audit view */
export function auditMonthGsi1(ts: string) {
  // ts is full ISO string; monthKey lives in time.ts but we inline to avoid circular deps
  const month = ts.slice(0, 7); // "yyyy-mm"
  return { GSI1PK: `AUDIT#${month}`, GSI1SK: ts } as const;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function statsDayKey(day: string) {
  return { PK: "STATS", SK: `DAY#${day}` } as const;
}

// ---------------------------------------------------------------------------
// Donor pool
// ---------------------------------------------------------------------------

export function poolKey(poolId: string) {
  return { PK: `POOL#${poolId}`, SK: "META" } as const;
}

export function poolsGsi1(poolId: string) {
  return { GSI1PK: "POOLS", GSI1SK: poolId } as const;
}

// ---------------------------------------------------------------------------
// Query-prefix helpers (GSI/table partition values for query calls)
// ---------------------------------------------------------------------------

/** GSI2PK for blood-centre stock console */
export function stockPartition(facId: string) {
  return `FACILITY#${facId}#STOCK`;
}

/** GSI2PK for hospital offer inbox */
export function inboxPartition(facId: string) {
  return `FACILITY#${facId}#INBOX`;
}

/** GSI2PK for hospital's requisitions */
export function reqsPartition(facId: string) {
  return `FACILITY#${facId}#REQS`;
}

/** GSI1PK for unit expiry work queues */
export function queuePartition(status: UnitStatus, component: Component) {
  return `QUEUE#${status}#${component}`;
}

/** GSI1PK for open-requisition work queue */
export function openReqPartition(component: Component) {
  return `OPENREQ#${component}`;
}
