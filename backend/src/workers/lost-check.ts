/**
 * backend/src/workers/lost-check.ts
 *
 * Lost-check worker:
 * Queries GSI1 QUEUE#RESCUE_PENDING#<component> with SK <= now.
 * For each hit:
 * 1. Transitions unit to LOST (audit UNIT_LOST)
 * 2. Updates daily stats with ADD (unitsLost, valueLostInr)
 * 3. Marks remaining open offers EXPIRED
 * 4. Closes the escalation
 */

import {
  COMPONENTS,
  isoNow,
  type BloodUnit,
  type Offer,
} from "@pulsechain/shared";
import { queryAll, transact } from "../lib/db.js";
import {
  transitionRescuePendingToLost,
  transitionOfferOpenToExpired,
} from "../lib/transitions.js";
import { recordUnitLost } from "../lib/stats.js";

export interface LostCheckResult {
  timestamp: string;
  lostCount: number;
  lostUnitIds: string[];
}

export async function runLostCheck(nowStr?: string): Promise<LostCheckResult> {
  const ts = nowStr ?? isoNow();
  const lostUnitIds: string[] = [];

  for (const component of COMPONENTS) {
    const expiredHits = await queryAll<BloodUnit & { GSI1PK: string; GSI1SK: string }>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk AND GSI1SK <= :now",
      values: {
        ":pk": `QUEUE#RESCUE_PENDING#${component}`,
        ":now": ts,
      },
    });

    for (const unit of expiredHits) {
      try {
        // 1. Transition RESCUE_PENDING → LOST
        await transitionRescuePendingToLost({
          unitId: unit.unitId,
          timestamp: ts,
        });

        // 2. Update daily stats
        await recordUnitLost(unit.valueInr, ts);

        // 3. Mark remaining open offers EXPIRED
        const openOffers = await queryAll<Offer & { SK: string }>({
          keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
          values: {
            ":pk": `UNIT#${unit.unitId}`,
            ":skPrefix": "OFFER#",
          },
        });

        for (const offer of openOffers) {
          if (offer.status === "OPEN") {
            try {
              await transitionOfferOpenToExpired({
                unitId: unit.unitId,
                offerSk: offer.SK,
                offerId: offer.offerId,
                timestamp: ts,
              });
            } catch {
              // Ignore if already transitioned
            }
          }
        }

        // 4. Close escalation if present
        if (unit.activeEscalationId) {
          try {
            await transact([
              {
                Update: {
                  Key: {
                    PK: `UNIT#${unit.unitId}`,
                    SK: `ESC#${unit.activeEscalationId}`,
                  },
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
          } catch {
            // Ignore if already ended
          }
        }

        lostUnitIds.push(unit.unitId);
      } catch (err: any) {
        if (
          err.name === "TransactionCanceledException" ||
          err.message?.includes("ConditionalCheckFailed")
        ) {
          // Already transitioned concurrently
          continue;
        }
        throw err;
      }
    }
  }

  return {
    timestamp: ts,
    lostCount: lostUnitIds.length,
    lostUnitIds,
  };
}

export async function handler(event?: any) {
  return await runLostCheck();
}
