/**
 * backend/src/lib/audit.ts
 *
 * Audit event builder and persistence helpers.
 * Every status change writes an audit row in the same transaction.
 */

import { randomUUID } from "crypto";
import {
  auditKey,
  auditMonthGsi1,
  isoNow,
  type AuditEvent,
  type AuditEventType,
  type EscalationSubject,
} from "@pulsechain/shared";
import { putItem, type TransactItem } from "./db.js";

export interface CreateAuditParams {
  eventType: AuditEventType;
  subjectType: EscalationSubject;
  subjectId: string;
  actorFacilityId?: string | null;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface AuditRecord extends AuditEvent {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: "AUDIT";
}

/**
 * Builds a complete AuditRecord object with DynamoDB PK/SK/GSI keys.
 */
export function buildAuditEvent(params: CreateAuditParams): AuditRecord {
  const ts = params.timestamp ?? isoNow();
  const eventId = `EVT_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

  const keys = auditKey(params.subjectType, params.subjectId, ts, eventId);
  const gsi1 = auditMonthGsi1(ts);

  return {
    ...keys,
    ...gsi1,
    entityType: "AUDIT",
    eventId,
    eventType: params.eventType,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp: ts,
    details: params.details ?? {},
  };
}

/**
 * Builds a DynamoDB Put transaction item for TransactWriteItems.
 */
export function buildAuditTransactItem(params: CreateAuditParams): {
  event: AuditRecord;
  transactItem: TransactItem;
} {
  const event = buildAuditEvent(params);
  return {
    event,
    transactItem: {
      Put: {
        Item: event,
      },
    },
  };
}

/**
 * Directly writes an audit event (used for standalone events like CLAIM_REJECTED).
 */
export async function writeAuditEvent(params: CreateAuditParams): Promise<AuditRecord> {
  const event = buildAuditEvent(params);
  await putItem(event);
  return event;
}
