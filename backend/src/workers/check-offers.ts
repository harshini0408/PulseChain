import {
  isoNow,
  unitKey,
  type BloodUnit,
  type Offer,
} from "@pulsechain/shared";
import { getItem, queryAll, requireTableName, docClient } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export interface CheckOffersInput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId: string;
}

export interface CheckOffersOutput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId: string;
  claimed: boolean;
  claimedBy?: string;
  activeRingOffers: number;
}

export async function handler(event: CheckOffersInput): Promise<CheckOffersOutput> {
  const { unitId, ring, escalationId } = event;

  // 1. Check if unit is already claimed/received
  const unitKeys = unitKey(unitId);
  const unit = await getItem<BloodUnit>(unitKeys.PK, unitKeys.SK);

  if (unit && (unit.status === "CLAIMED" || unit.status === "IN_TRANSIT" || unit.status === "RECEIVED")) {
    return {
      unitId,
      ring,
      escalationId,
      claimed: true,
      claimedBy: unit.claimedBy,
      activeRingOffers: 0,
    };
  }

  // 2. Query all offers for this ring
  const offerSkPrefix = `OFFER#${escalationId}#R${ring}#`;
  const offers = await queryAll<Offer & Record<string, any>>({
    keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
    values: {
      ":pk": `UNIT#${unitId}`,
      ":skPrefix": offerSkPrefix,
    },
  });

  let claimed = false;
  let claimedByFacility: string | undefined;
  const now = isoNow();

  for (const offer of offers) {
    if (offer.status === "CLAIMED") {
      claimed = true;
      claimedByFacility = offer.recipientFacilityId;
    }
  }

  // 3. If none claimed, expire all OPEN offers in this ring
  if (!claimed) {
    for (const offer of offers) {
      if (offer.status === "OPEN") {
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: requireTableName(),
              Key: { PK: `UNIT#${unitId}`, SK: offer.SK },
              UpdateExpression: "SET #status = :status, #expiredAt = :now",
              ExpressionAttributeNames: {
                "#status": "status",
                "#expiredAt": "expiredAt",
              },
              ExpressionAttributeValues: {
                ":status": "EXPIRED",
                ":now": now,
              },
            })
          );

          await writeAuditEvent({
            eventType: "OFFER_EXPIRED",
            subjectType: "UNIT",
            subjectId: unitId,
            actorFacilityId: offer.recipientFacilityId,
            details: {
              offerId: offer.offerId,
              ring,
              escalationId,
            },
          });
        } catch (err) {
          console.warn(`Could not expire offer ${offer.offerId}:`, err);
        }
      }
    }
  }

  return {
    unitId,
    ring,
    escalationId,
    claimed,
    claimedBy: claimedByFacility,
    activeRingOffers: offers.length,
  };
}
