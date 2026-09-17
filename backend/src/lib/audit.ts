import { randomUUID } from "node:crypto";
import {
  auditKey,
  auditMonthGsi1,
  isoNow,
  type AuditEvent,
  type AuditEventType,
  type EscalationSubject,
  type WithKeys,
} from "@pulsechain/shared";
import { putItem, type TransactItem } from "./db.js";

export interface CreateAuditParams {
  eventType: AuditEventType;
  subjectType: EscalationSubject;
  subjectId: string;
  actorFacilityId?: string | null;
  details?: Record<string, unknown>;
  timestamp?: string;
  eventId?: string;
}

export function buildAuditEvent(params: CreateAuditParams): WithKeys<AuditEvent> & AuditEvent {
  const eventId = params.eventId ?? randomUUID();
  const timestamp = params.timestamp ?? isoNow();
  const keys = auditKey(params.subjectType, params.subjectId, timestamp, eventId);
  const gsi1 = auditMonthGsi1(timestamp);

  const event: AuditEvent = {
    eventId,
    eventType: params.eventType,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actorFacilityId: params.actorFacilityId ?? null,
    timestamp,
    details: params.details ?? {},
  };

  return {
    ...keys,
    ...gsi1,
    entityType: "AuditEvent",
    ...event,
  };
}

export function buildAuditTransactItem(params: CreateAuditParams): TransactItem {
  const item = buildAuditEvent(params);
  return {
    Put: {
      Item: item,
    },
  };
}

export async function writeAuditEvent(params: CreateAuditParams): Promise<AuditEvent> {
  const item = buildAuditEvent(params);
  await putItem(item);
  return item;
}
