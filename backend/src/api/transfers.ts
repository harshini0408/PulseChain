/**
 * backend/src/api/transfers.ts
 *
 * Transfer lifecycle endpoints:
 * - POST /transfers/:unitId/in-transit: CLAIMED → IN_TRANSIT
 * - POST /transfers/:unitId/received: IN_TRANSIT → RECEIVED (updates facilityId to recipient)
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  unitKey,
  isoNow,
  transferInTransitSchema,
  transferReceivedSchema,
  type BloodUnit,
} from "@pulsechain/shared";
import { getItem } from "../lib/db.js";
import { badRequest, notFound, ok, withErrors } from "../lib/http.js";
import { requireCallerFacility } from "../lib/auth.js";
import {
  transitionClaimedToInTransit,
  transitionInTransitToReceived,
} from "../lib/transitions.js";

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const now = isoNow();

    const unitId = event.pathParameters?.unitId;
    if (!unitId) {
      return badRequest("Missing unitId parameter");
    }

    const key = unitKey(unitId);
    const unit = await getItem<BloodUnit>(key.PK, key.SK);
    if (!unit) {
      return notFound(`Unit not found: ${unitId}`);
    }

    const callerFacility = requireCallerFacility(event);

    // 1. POST /transfers/:unitId/in-transit
    if (method === "POST" && path.endsWith("/in-transit")) {
      if (unit.status !== "CLAIMED") {
        return badRequest(`Cannot dispatch transfer: unit status is ${unit.status} (expected CLAIMED)`);
      }

      if (event.body) {
        try {
          transferInTransitSchema.parse(JSON.parse(event.body));
        } catch (err: any) {
          return badRequest(`Invalid payload: ${err.message}`);
        }
      }

      await transitionClaimedToInTransit({
        unitId,
        actorFacilityId: callerFacility,
        timestamp: now,
      });

      return ok({
        ok: true,
        unitId,
        status: "IN_TRANSIT",
        dispatchedBy: callerFacility,
        timestamp: now,
      });
    }

    // 2. POST /transfers/:unitId/received
    if (method === "POST" && path.endsWith("/received")) {
      if (unit.status !== "IN_TRANSIT") {
        return badRequest(`Cannot receive transfer: unit status is ${unit.status} (expected IN_TRANSIT)`);
      }

      if (event.body) {
        try {
          transferReceivedSchema.parse(JSON.parse(event.body));
        } catch (err: any) {
          return badRequest(`Invalid payload: ${err.message}`);
        }
      }

      const recipientFacilityId = unit.claimedBy ?? callerFacility;

      await transitionInTransitToReceived({
        unitId,
        recipientFacilityId,
        expiresAt: unit.expiresAt,
        actorFacilityId: callerFacility,
        timestamp: now,
      });

      return ok({
        ok: true,
        unitId,
        status: "RECEIVED",
        facilityId: recipientFacilityId,
        receivedBy: callerFacility,
        timestamp: now,
      });
    }

    return notFound("Route not found");
  },
);
