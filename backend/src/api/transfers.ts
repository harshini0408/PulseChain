import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { badRequest, conflict, notFound, ok, withErrors } from "../lib/http.js";
import { transitionUnit } from "../lib/transitions.js";
import { getAuthContext } from "../lib/auth.js";

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const pathParams = event.pathParameters || {};
    const auth = getAuthContext(event);

    const unitId = pathParams.id;
    if (!unitId) {
      return badRequest("Missing unitId in URL path");
    }

    let body: any = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {}
    }

    // -------------------------------------------------------------------------
    // POST /units/{id}/in-transit — Blood centre marks dispatched
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/in-transit")) {
      try {
        const updatedUnit = await transitionUnit(unitId, "CLAIMED", "IN_TRANSIT", {
          actorFacilityId: auth.facilityId,
          note: body.note || "Unit dispatched by blood centre",
          details: {
            courier: body.courier,
            trackingNumber: body.trackingNumber,
            temperatureVerified: body.temperatureVerified ?? true,
          },
        });

        return ok({
          success: true,
          message: `Unit ${unitId} is now IN_TRANSIT`,
          unit: updatedUnit,
        });
      } catch (err: any) {
        return conflict(`Could not dispatch unit: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // POST /units/{id}/received — Hospital confirms receipt
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/received")) {
      try {
        const updatedUnit = await transitionUnit(unitId, "IN_TRANSIT", "RECEIVED", {
          actorFacilityId: auth.facilityId,
          note: body.note || "Unit received and accepted by hospital",
          details: {
            verifiedBy: body.verifiedBy || auth.userId,
            conditionOk: body.conditionOk ?? true,
          },
        });

        return ok({
          success: true,
          message: `Unit ${unitId} successfully RECEIVED. Life saved!`,
          unit: updatedUnit,
        });
      } catch (err: any) {
        return conflict(`Could not confirm receipt: ${err.message}`);
      }
    }

    return badRequest(`Unsupported route: ${method} ${path}`);
  }
);
