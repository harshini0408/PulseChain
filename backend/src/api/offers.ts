import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  inboxPartition,
  isoNow,
  type Offer,
} from "@pulsechain/shared";
import { docClient, getItem, putItem, queryAll, requireTableName } from "../lib/db.js";
import { badRequest, conflict, notFound, ok, withErrors } from "../lib/http.js";
import { transitionUnit } from "../lib/transitions.js";
import { writeAuditEvent } from "../lib/audit.js";
import { getAuthContext } from "../lib/auth.js";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const pathParams = event.pathParameters || {};
    const query = event.queryStringParameters || {};
    const auth = getAuthContext(event);

    // -------------------------------------------------------------------------
    // GET /inbox — View redistribution offers for hospital
    // -------------------------------------------------------------------------
    if (method === "GET" && (path.includes("/inbox") || path.endsWith("/offers"))) {
      const facilityId = query.facilityId || auth.facilityId;
      if (!facilityId) {
        return badRequest("Missing facilityId (provide query param or x-facility-id header)");
      }

      const items = await queryAll<Offer & Record<string, any>>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": inboxPartition(facilityId),
        },
      });

      const cleanOffers: Offer[] = items.map((item) => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
        return rest as Offer;
      });

      // Filter to open offers by default, or return all
      return ok(cleanOffers);
    }

    // -------------------------------------------------------------------------
    // POST /offers/{id}/claim — Claim an offer
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/claim")) {
      const offerId = pathParams.id;
      let body: any = {};
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch {}
      }

      const unitId = body.unitId || offerId?.split("__")[0];
      const escalationId = body.escalationId || offerId?.split("__")[1];
      const ring = (body.ring ? Number(body.ring) : Number(offerId?.split("__")[2])) as 1 | 2 | 3;
      const recipientFacilityId = body.recipientFacilityId || offerId?.split("__")[3] || auth.facilityId;

      if (!unitId) {
        return badRequest("Missing unitId in claim request");
      }

      const offerSk = `OFFER#${escalationId || "ESC"}#R${ring || 1}#${recipientFacilityId}`;
      const offerPk = `UNIT#${unitId}`;

      // Check offer
      let offer = await getItem<Offer>(offerPk, offerSk);
      
      // Fallback: If not found by direct key, search by PK
      if (!offer) {
        const offers = await queryAll<Offer & Record<string, any>>({
          keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
          values: {
            ":pk": offerPk,
            ":skPrefix": "OFFER#",
          },
        });
        const matched = offers.find(
          (o) => o.offerId === offerId || o.recipientFacilityId === recipientFacilityId
        );
        if (matched) {
          offer = matched;
        }
      }

      if (!offer) {
        return notFound(`Offer ${offerId} not found`);
      }

      if (offer.status !== "OPEN") {
        return conflict(`Offer ${offer.offerId} is already ${offer.status}`);
      }

      const now = isoNow();
      if (offer.claimBy && now > offer.claimBy) {
        return conflict(`Offer ${offer.offerId} has expired at ${offer.claimBy}`);
      }

      // 1. Atomically transition unit to CLAIMED
      try {
        const updatedUnit = await transitionUnit(
          unitId,
          "RESCUE_PENDING",
          "CLAIMED",
          {
            actorFacilityId: recipientFacilityId,
            claimedBy: recipientFacilityId,
            activeEscalationId: offer.escalationId,
            note: `Offer ${offer.offerId} claimed by ${recipientFacilityId}`,
          }
        );

        // 2. Mark offer status as CLAIMED
        await docClient.send(
          new UpdateCommand({
            TableName: requireTableName(),
            Key: { PK: offerPk, SK: (offer as any).SK || offerSk },
            UpdateExpression: "SET #status = :status, #respondedAt = :now",
            ExpressionAttributeNames: {
              "#status": "status",
              "#respondedAt": "respondedAt",
            },
            ExpressionAttributeValues: {
              ":status": "CLAIMED",
              ":now": now,
            },
          })
        );

        return ok({
          success: true,
          message: `Unit ${unitId} successfully claimed by ${recipientFacilityId}`,
          unit: updatedUnit,
          offer: {
            ...offer,
            status: "CLAIMED",
            respondedAt: now,
          },
        });
      } catch (err: any) {
        return conflict(`Could not claim unit: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // POST /offers/{id}/decline — Decline an offer
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/decline")) {
      const offerId = pathParams.id;
      let body: any = {};
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch {}
      }

      const unitId = body.unitId || offerId?.split("__")[0];
      const escalationId = body.escalationId || offerId?.split("__")[1];
      const ring = (body.ring ? Number(body.ring) : Number(offerId?.split("__")[2])) as 1 | 2 | 3;
      const recipientFacilityId = body.recipientFacilityId || offerId?.split("__")[3] || auth.facilityId;

      if (!unitId) {
        return badRequest("Missing unitId in decline request");
      }

      const offerSk = `OFFER#${escalationId || "ESC"}#R${ring || 1}#${recipientFacilityId}`;
      const offerPk = `UNIT#${unitId}`;
      const now = isoNow();

      try {
        await docClient.send(
          new UpdateCommand({
            TableName: requireTableName(),
            Key: { PK: offerPk, SK: offerSk },
            UpdateExpression: "SET #status = :status, #respondedAt = :now",
            ExpressionAttributeNames: {
              "#status": "status",
              "#respondedAt": "respondedAt",
            },
            ExpressionAttributeValues: {
              ":status": "DECLINED",
              ":now": now,
            },
          })
        );

        await writeAuditEvent({
          eventType: "OFFER_DECLINED",
          subjectType: "UNIT",
          subjectId: unitId,
          actorFacilityId: recipientFacilityId,
          details: {
            offerId,
            reason: body.reason || "Declined by recipient facility",
          },
        });

        return ok({
          success: true,
          message: `Offer ${offerId} declined`,
        });
      } catch (err: any) {
        return conflict(`Could not decline offer: ${err.message}`);
      }
    }

    return badRequest(`Unsupported route: ${method} ${path}`);
  }
);
