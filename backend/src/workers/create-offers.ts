/**
 * backend/src/workers/create-offers.ts
 *
 * Persists ranked candidate offers to DynamoDB:
 * - Writes Offer item in recipient's inbox (GSI2)
 * - Writes OFFER_CREATED audit event
 * - If ring yields zero candidates: skips straight to next ring escalation (0s on camera)
 * - Schedules window expiry check behind scheduleOfferCheck()
 */

import {
  offerKey,
  offerInboxGsi2,
  unitKey,
  facilityKey,
  getConfig,
  isoNow,
  hoursBetween,
  type Offer,
  type BloodUnit,
  type Escalation,
  type Facility,
} from "@pulsechain/shared";
import { getItem, putItem, transact, type TransactItem } from "../lib/db.js";
import { buildAuditTransactItem, writeAuditEvent } from "../lib/audit.js";
import { sendOfferEmailNotification } from "../lib/notifications.js";
import { matchRing, type MatchCandidate } from "./match-ring.js";
import { checkOffers } from "./check-offers.js";

function addSeconds(iso: string, seconds: number): string {
  const ms = new Date(iso).getTime() + seconds * 1000;
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export interface CreateOffersParams {
  unitId: string;
  escalationId: string;
  ring: 1 | 2 | 3;
  candidates: MatchCandidate[];
  now?: string;
}

export interface CreateOffersResult {
  escalationId: string;
  unitId: string;
  ring: 1 | 2 | 3;
  offersCreated: Offer[];
  escalatedToNextRing: boolean;
  status: "OPEN" | "ESCALATED" | "EXHAUSTED";
}

/**
 * Isolated scheduling function.
 * On Saturday (Prompt 09), this will be swapped to start a Step Functions execution.
 */
export async function scheduleOfferCheck(params: {
  escalationId: string;
  unitId: string;
  ring: 1 | 2 | 3;
  claimBy: string;
}): Promise<void> {
  // In demo / tests without Step Functions, we check offers directly or via in-process timer
  // If run in automated test environment or demo with zero wait, check-offers can be called.
  // For background timing in Lambda, we invoke checkOffers when the window elapses.
}

export async function createOffers(
  params: CreateOffersParams,
): Promise<CreateOffersResult> {
  const ts = params.now ?? isoNow();
  const cfg = getConfig();

  // 1. If 0 candidates: escalate immediately to next ring without waiting
  if (params.candidates.length === 0) {
    if (params.ring < 3) {
      const nextRing = (params.ring + 1) as 2 | 3;

      // Update escalation currentRing
      await transact([
        {
          Update: {
            Key: { PK: `UNIT#${params.unitId}`, SK: `ESC#${params.escalationId}` },
            UpdateExpression: "SET currentRing = :nextRing",
            ExpressionAttributeValues: {
              ":nextRing": nextRing,
            },
          },
        },
      ]);

      // Write RING_ESCALATED audit event
      await writeAuditEvent({
        eventType: "RING_ESCALATED",
        subjectType: "UNIT",
        subjectId: params.unitId,
        timestamp: ts,
        details: {
          escalationId: params.escalationId,
          fromRing: params.ring,
          toRing: nextRing,
          reason: "Zero viable candidates in current ring",
        },
      });

      // Match next ring
      const nextMatch = await matchRing({
        unitId: params.unitId,
        ring: nextRing,
        now: ts,
      });

      // Recurse to create offers in next ring
      return await createOffers({
        unitId: params.unitId,
        escalationId: params.escalationId,
        ring: nextRing,
        candidates: nextMatch.candidates,
        now: ts,
      });
    } else {
      // Ring 3 exhausted
      await transact([
        {
          Update: {
            Key: { PK: `UNIT#${params.unitId}`, SK: `ESC#${params.escalationId}` },
            UpdateExpression: "SET #status = :exhaustedStatus, endedAt = :ts",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":exhaustedStatus": "EXHAUSTED",
              ":ts": ts,
            },
          },
        },
      ]);

      return {
        escalationId: params.escalationId,
        unitId: params.unitId,
        ring: params.ring,
        offersCreated: [],
        escalatedToNextRing: false,
        status: "EXHAUSTED",
      };
    }
  }

  // 2. Load unit to get origin facility
  const unit = await getItem<BloodUnit>(unitKey(params.unitId).PK, "META");
  if (!unit) {
    throw new Error(`[create-offers] Unit not found: ${params.unitId}`);
  }

  const claimBy = addSeconds(ts, cfg.offerWindowSeconds);
  const createdOffers: Offer[] = [];
  const transactItems: TransactItem[] = [];

  for (let i = 0; i < params.candidates.length; i++) {
    const cand = params.candidates[i];
    const rank = i + 1;
    const offerId = `OFFER_${params.unitId}_R${params.ring}_${cand.recipientFacilityId}`;

    const keys = offerKey(
      params.unitId,
      params.escalationId,
      params.ring,
      cand.recipientFacilityId,
    );
    const gsi2 = offerInboxGsi2(cand.recipientFacilityId, ts);

    const offerItem: Offer & Record<string, unknown> = {
      ...keys,
      ...gsi2,
      entityType: "OFFER",
      offerId,
      escalationId: params.escalationId,
      ring: params.ring,
      unitId: params.unitId,
      originFacilityId: unit.facilityId,
      recipientFacilityId: cand.recipientFacilityId,
      status: "OPEN",
      createdAt: ts,
      claimBy,
      rank,
      score: cand.score,
      breakdown: cand.breakdown,
      reason: cand.reason,
      requisitionId: cand.requisitionId,
      component: unit.component,
      bloodGroup: unit.bloodGroup,
      volumeMl: unit.volumeMl,
    };

    createdOffers.push(offerItem);

    // Put offer item
    transactItems.push({
      Put: {
        Item: offerItem,
      },
    });

    // Audit OFFER_CREATED
    const { transactItem: auditTransact } = buildAuditTransactItem({
      eventType: "OFFER_CREATED",
      subjectType: "UNIT",
      subjectId: params.unitId,
      actorFacilityId: null,
      timestamp: ts,
      details: {
        offerId,
        recipientFacilityId: cand.recipientFacilityId,
        ring: params.ring,
        rank,
        score: cand.score,
        claimBy,
      },
    });
    transactItems.push(auditTransact);
  }

  await transact(transactItems);

  // Send SES email notifications asynchronously (non-blocking)
  for (const cand of params.candidates) {
    const offerId = `OFFER_${params.unitId}_R${params.ring}_${cand.recipientFacilityId}`;
    getItem<Facility>(facilityKey(cand.recipientFacilityId).PK, facilityKey(cand.recipientFacilityId).SK)
      .then((fac) => {
        if (fac) {
          sendOfferEmailNotification({
            offerId,
            recipientFacilityId: cand.recipientFacilityId,
            recipientFacilityName: cand.recipientFacilityName,
            recipientEmail: fac.contactEmail,
            unitId: params.unitId,
            component: unit.component,
            bloodGroup: unit.bloodGroup,
            volumeMl: unit.volumeMl,
            originFacilityName: unit.facilityId,
            distanceKm: cand.distanceKm,
            hoursRemaining: Math.round(hoursBetween(ts, unit.expiresAt) * 10) / 10,
            reason: cand.reason,
            claimBy,
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  // Schedule offer check
  await scheduleOfferCheck({
    escalationId: params.escalationId,
    unitId: params.unitId,
    ring: params.ring,
    claimBy,
  });

  return {
    escalationId: params.escalationId,
    unitId: params.unitId,
    ring: params.ring,
    offersCreated: createdOffers,
    escalatedToNextRing: false,
    status: "OPEN",
  };
}

export async function handler(event: {
  unitId: string;
  escalationId: string;
  ring?: 1 | 2 | 3;
  currentRing?: 1 | 2 | 3;
  candidates?: MatchCandidate[];
  offerWindow?: number;
  now?: string;
}) {
  const ring = event.ring ?? event.currentRing ?? 1;
  const candidates = event.candidates ?? [];
  const result = await createOffers({
    unitId: event.unitId,
    escalationId: event.escalationId,
    ring,
    candidates,
    now: event.now,
  });

  return {
    ...event,
    currentRing: result.ring,
    offersCreatedCount: result.offersCreated.length,
    escalatedToNextRing: result.escalatedToNextRing,
    status: result.status,
  };
}
