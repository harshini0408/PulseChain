/**
 * backend/src/workers/check-offers.ts
 *
 * Checks open offers for an escalation after their claimBy window elapses:
 * - Marks expired offers EXPIRED (audit OFFER_EXPIRED)
 * - Rings 1 & 2: escalates to next ring (currentRing + 1, audit RING_ESCALATED, calls match-ring)
 * - Ring 3: marks escalation EXHAUSTED (unit remains RESCUE_PENDING until true expiry)
 */

import {
  isoNow,
  type BloodUnit,
  type Escalation,
  type Offer,
} from "@pulsechain/shared";
import { getItem, queryAll, transact } from "../lib/db.js";
import { transitionOfferOpenToExpired } from "../lib/transitions.js";
import { writeAuditEvent } from "../lib/audit.js";
import { matchRing } from "./match-ring.js";
import { createOffers } from "./create-offers.js";

export interface CheckOffersParams {
  escalationId: string;
  unitId: string;
  ring: 1 | 2 | 3;
  now?: string;
}

export async function checkOffers(params: CheckOffersParams): Promise<{
  status: "RESOLVED" | "ESCALATED" | "EXHAUSTED" | "WAITING";
  currentRing: number;
}> {
  const ts = params.now ?? isoNow();

  // 1. Load escalation
  const esc = await getItem<Escalation>(
    `UNIT#${params.unitId}`,
    `ESC#${params.escalationId}`,
  );
  if (!esc || esc.status !== "RUNNING") {
    return { status: "RESOLVED", currentRing: params.ring };
  }

  // 2. Load unit
  const unit = await getItem<BloodUnit>(`UNIT#${params.unitId}`, "META");
  if (!unit || unit.status !== "RESCUE_PENDING") {
    return { status: "RESOLVED", currentRing: params.ring };
  }

  // 3. Query all offers for this escalation
  const offers = await queryAll<Offer & { SK: string }>({
    keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
    values: {
      ":pk": `UNIT#${params.unitId}`,
      ":skPrefix": `OFFER#${params.escalationId}#`,
    },
  });

  // Check if any offer was claimed
  const hasClaimed = offers.some((o) => o.status === "CLAIMED");
  if (hasClaimed) {
    await transact([
      {
        Update: {
          Key: { PK: `UNIT#${params.unitId}`, SK: `ESC#${params.escalationId}` },
          UpdateExpression: "SET #status = :resolvedStatus, endedAt = :ts",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":resolvedStatus": "RESOLVED",
            ":ts": ts,
          },
        },
      },
    ]);
    return { status: "RESOLVED", currentRing: params.ring };
  }

  // Expire any OPEN offers that are past claimBy
  for (const offer of offers) {
    if (offer.status === "OPEN" && offer.claimBy <= ts) {
      await transitionOfferOpenToExpired({
        unitId: params.unitId,
        offerSk: offer.SK,
        offerId: offer.offerId,
        timestamp: ts,
      });
    }
  }

  // Re-read offers or check if any are still OPEN and unexpired
  const remainingOpen = offers.filter(
    (o) => o.status === "OPEN" && o.claimBy > ts,
  );
  if (remainingOpen.length > 0) {
    return { status: "WAITING", currentRing: params.ring };
  }

  // All offers for this ring are expired/declined: escalate or exhaust
  if (params.ring < 3) {
    const nextRing = (params.ring + 1) as 2 | 3;

    // Update escalation record
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

    // Audit RING_ESCALATED
    await writeAuditEvent({
      eventType: "RING_ESCALATED",
      subjectType: "UNIT",
      subjectId: params.unitId,
      timestamp: ts,
      details: {
        escalationId: params.escalationId,
        fromRing: params.ring,
        toRing: nextRing,
        reason: "Ring offers expired without claim",
      },
    });

    // Match and create offers in next ring
    const matchResult = await matchRing({
      unitId: params.unitId,
      ring: nextRing,
      now: ts,
    });

    await createOffers({
      unitId: params.unitId,
      escalationId: params.escalationId,
      ring: nextRing,
      candidates: matchResult.candidates,
      now: ts,
    });

    return { status: "ESCALATED", currentRing: nextRing };
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

    return { status: "EXHAUSTED", currentRing: 3 };
  }
}

export async function handler(event: {
  unitId: string;
  escalationId: string;
  ring?: 1 | 2 | 3;
  currentRing?: 1 | 2 | 3;
  offerWindow?: number;
  now?: string;
}) {
  const ring = event.ring ?? event.currentRing ?? 1;
  const result = await checkOffers({
    unitId: event.unitId,
    escalationId: event.escalationId,
    ring,
    now: event.now,
  });

  return {
    ...event,
    currentRing: result.currentRing,
    status: result.status,
  };
}
