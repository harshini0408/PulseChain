/**
 * backend/src/api/offers.ts
 *
 * Offer endpoints:
 * - GET /facilities/:id/inbox: list hospital inbox offers (GSI2)
 * - POST /offers/:id/claim: atomic claim transaction with 409 conflict handling
 * - POST /offers/:id/decline: decline offer; triggers immediate escalation if all ring offers decline
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  isoNow,
  type Offer,
  type BloodUnit,
  type Facility,
  type Escalation,
} from "@pulsechain/shared";
import { SFNClient, StopExecutionCommand } from "@aws-sdk/client-sfn";
import { getItem, queryAll, transact } from "../lib/db.js";
import { badRequest, conflict, forbidden, notFound, ok, withErrors } from "../lib/http.js";
import { requireCallerFacility, getCallerContext } from "../lib/auth.js";
import {
  executeClaimTransaction,
  transitionOfferOpenToDeclined,
  transitionOfferOpenToSuperseded,
} from "../lib/transitions.js";
import { writeAuditEvent } from "../lib/audit.js";
import { recordUnitSaved } from "../lib/stats.js";
import { checkOffers } from "../workers/check-offers.js";

interface OfferWithKeys extends Offer {
  PK: string;
  SK: string;
}

/**
 * Finds an offer by offerId across inboxes or unit records.
 */
async function findOfferById(
  offerIdOrSk: string,
  preferredFacilityId?: string | null,
): Promise<OfferWithKeys | null> {
  // 1. Look in preferred facility's inbox first
  if (preferredFacilityId) {
    const inboxItems = await queryAll<OfferWithKeys>({
      indexName: "GSI2",
      keyCondition: "GSI2PK = :pk",
      values: {
        ":pk": `FACILITY#${preferredFacilityId}#INBOX`,
      },
    });

    const match = inboxItems.find(
      (o) => o.offerId === offerIdOrSk || o.SK === offerIdOrSk || o.SK.endsWith(offerIdOrSk),
    );
    if (match) return match;
  }

  // 2. Parse offerId format: OFFER_<unitId>_R<ring>_<recipientFacilityId>
  const match = offerIdOrSk.match(/^OFFER_(.+)_(R[123])_(.+)$/);
  if (match) {
    const [, unitId, , recipientId] = match;
    const unitOffers = await queryAll<OfferWithKeys>({
      keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
      values: {
        ":pk": `UNIT#${unitId}`,
        ":skPrefix": "OFFER#",
      },
    });
    const found = unitOffers.find(
      (o) => o.offerId === offerIdOrSk || o.SK === offerIdOrSk || o.SK.endsWith(offerIdOrSk),
    );
    if (found) return found;

    const recipientInbox = await queryAll<OfferWithKeys>({
      indexName: "GSI2",
      keyCondition: "GSI2PK = :pk",
      values: {
        ":pk": `FACILITY#${recipientId}#INBOX`,
      },
    });
    const inboxMatch = recipientInbox.find(
      (o) => o.offerId === offerIdOrSk || o.SK === offerIdOrSk || o.SK.endsWith(offerIdOrSk),
    );
    if (inboxMatch) return inboxMatch;
  }

  return null;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const now = isoNow();

    // ─── 1. GET /facilities/:id/inbox ─────────────────────────────────────
    if (method === "GET" && path.includes("/facilities/") && path.endsWith("/inbox")) {
      const facilityId = event.pathParameters?.id;
      if (!facilityId) return badRequest("Missing facility id parameter");

      const items = await queryAll<OfferWithKeys>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": `FACILITY#${facilityId}#INBOX`,
        },
      });

      // Enrich with unit metadata if missing on the offer item
      for (const item of items) {
        if (!item.component || !item.bloodGroup) {
          const unit = await getItem<BloodUnit>(`UNIT#${item.unitId}`, "META");
          if (unit) {
            item.component = unit.component;
            item.bloodGroup = unit.bloodGroup;
            item.volumeMl = unit.volumeMl;
          }
        }
      }

      // Sort: OPEN offers first (by rank ascending), then other offers by createdAt descending
      items.sort((a, b) => {
        if (a.status === "OPEN" && b.status !== "OPEN") return -1;
        if (a.status !== "OPEN" && b.status === "OPEN") return 1;
        if (a.status === "OPEN" && b.status === "OPEN") return a.rank - b.rank;
        return b.createdAt.localeCompare(a.createdAt);
      });

      return ok(items);
    }

    // ─── 2. POST /offers/:id/claim ────────────────────────────────────────
    if (method === "POST" && path.includes("/offers/") && path.endsWith("/claim")) {
      const offerIdParam = event.pathParameters?.id;
      if (!offerIdParam) return badRequest("Missing offer id parameter");

      const callerFacilityId = requireCallerFacility(event);

      // Find offer
      const offer = await findOfferById(offerIdParam, callerFacilityId);
      if (!offer) {
        return notFound(`Offer not found: ${offerIdParam}`);
      }

      // Authorization: Caller must be the recipient hospital
      if (offer.recipientFacilityId !== callerFacilityId) {
        return forbidden(
          `Forbidden: Offer is addressed to ${offer.recipientFacilityId}, caller is ${callerFacilityId}`,
        );
      }

      // Check if offer expired
      if (offer.claimBy <= now) {
        return conflict("Offer has already expired");
      }

      // Execute atomic claim transaction
      try {
        await executeClaimTransaction({
          unitId: offer.unitId,
          offerSk: offer.SK,
          offerId: offer.offerId,
          recipientFacilityId: callerFacilityId,
          claimBy: offer.claimBy,
          timestamp: now,
        });
      } catch (err: any) {
        // Race condition / ConditionalCheckFailed
        if (
          err.name === "TransactionCanceledException" ||
          err.message?.includes("ConditionalCheckFailed")
        ) {
          // Read unit to see who claimed it
          const unit = await getItem<BloodUnit>(`UNIT#${offer.unitId}`, "META");
          let holderName = unit?.claimedBy ?? "another facility";
          if (unit?.claimedBy) {
            const fac = await getItem<Facility>(`FACILITY#${unit.claimedBy}`, "PROFILE");
            if (fac) holderName = fac.name;
          }

          // Write CLAIM_REJECTED audit event
          await writeAuditEvent({
            eventType: "CLAIM_REJECTED",
            subjectType: "UNIT",
            subjectId: offer.unitId,
            actorFacilityId: callerFacilityId,
            timestamp: now,
            details: {
              offerId: offer.offerId,
              attemptedBy: callerFacilityId,
              currentHolder: unit?.claimedBy ?? null,
              reason: `Already claimed by ${holderName}`,
            },
          });

          return conflict(`Already claimed by ${holderName}`);
        }

        throw err;
      }

      // Post-claim cleanup:
      // 1. Mark sibling offers SUPERSEDED
      const siblings = await queryAll<OfferWithKeys>({
        keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
        values: {
          ":pk": `UNIT#${offer.unitId}`,
          ":skPrefix": `OFFER#${offer.escalationId}#`,
        },
      });

      for (const sib of siblings) {
        if (sib.offerId !== offer.offerId && sib.status === "OPEN") {
          try {
            await transitionOfferOpenToSuperseded({
              unitId: offer.unitId,
              offerSk: sib.SK,
              offerId: sib.offerId,
              timestamp: now,
            });
          } catch {
            // Ignore concurrent updates
          }
        }
      }

      // 2. Set escalation RESOLVED
      await transact([
        {
          Update: {
            Key: {
              PK: `UNIT#${offer.unitId}`,
              SK: `ESC#${offer.escalationId}`,
            },
            UpdateExpression: "SET #status = :resolvedStatus, endedAt = :ts",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":resolvedStatus": "RESOLVED",
              ":ts": now,
            },
          },
        },
      ]);

      // 3. Stop Step Functions execution if running
      const esc = await getItem<Escalation>(`UNIT#${offer.unitId}`, `ESC#${offer.escalationId}`);
      if (esc?.executionArn && esc.executionArn !== "direct-invoke") {
        try {
          const sfn = new SFNClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
          await sfn.send(
            new StopExecutionCommand({
              executionArn: esc.executionArn,
              cause: "OFFER_CLAIMED",
            }),
          );
        } catch (sfnErr: any) {
          console.log(`[Claim] SFN StopExecution notice: ${sfnErr.message}`);
        }
      }

      // 4. Update stats
      const unit = await getItem<BloodUnit>(`UNIT#${offer.unitId}`, "META");
      await recordUnitSaved(unit?.valueInr, now);

      return ok({
        ok: true,
        message: "Offer claimed successfully",
        unitId: offer.unitId,
        offerId: offer.offerId,
        claimedBy: callerFacilityId,
        claimedAt: now,
      });
    }

    // ─── 3. POST /offers/:id/decline ──────────────────────────────────────
    if (method === "POST" && path.includes("/offers/") && path.endsWith("/decline")) {
      const offerIdParam = event.pathParameters?.id;
      if (!offerIdParam) return badRequest("Missing offer id parameter");

      const callerFacilityId = requireCallerFacility(event);

      const offer = await findOfferById(offerIdParam, callerFacilityId);
      if (!offer) {
        return notFound(`Offer not found: ${offerIdParam}`);
      }

      if (offer.recipientFacilityId !== callerFacilityId) {
        return forbidden("Forbidden: Offer is addressed to another facility");
      }

      if (offer.status !== "OPEN") {
        return badRequest(`Cannot decline offer in status ${offer.status}`);
      }

      let reason = "Declined by hospital";
      if (event.body) {
        try {
          const body = JSON.parse(event.body);
          if (body.reason) reason = body.reason;
        } catch {
          // ignore
        }
      }

      await transitionOfferOpenToDeclined({
        unitId: offer.unitId,
        offerSk: offer.SK,
        offerId: offer.offerId,
        reason,
        actorFacilityId: callerFacilityId,
        timestamp: now,
      });

      // Check if all sibling offers in this ring have been declined/expired
      const ringOffers = await queryAll<OfferWithKeys>({
        keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
        values: {
          ":pk": `UNIT#${offer.unitId}`,
          ":skPrefix": `OFFER#${offer.escalationId}#R${offer.ring}#`,
        },
      });

      const anyStillOpen = ringOffers.some((o) => o.offerId !== offer.offerId && o.status === "OPEN");
      if (!anyStillOpen) {
        // Escalate immediately rather than waiting out the window!
        await checkOffers({
          escalationId: offer.escalationId,
          unitId: offer.unitId,
          ring: offer.ring,
          now,
        });
      }

      return ok({
        ok: true,
        message: "Offer declined",
        offerId: offer.offerId,
      });
    }

    return notFound("Route not found");
  },
);
