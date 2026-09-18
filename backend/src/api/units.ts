/**
 * backend/src/api/units.ts
 *
 * Blood unit endpoints:
 * - GET /facilities/:id/stock (GSI2 stock query, sorted by expiry, computed hoursRemaining)
 * - GET /units/:id
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  unitKey,
  hoursBetween,
  isoNow,
  type BloodUnit,
} from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";
import { badRequest, notFound, ok, withErrors } from "../lib/http.js";

export interface StockUnitResponse extends BloodUnit {
  hoursRemaining: number;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;
    const now = isoNow();

    // 1. GET /facilities/:id/stock
    if (method === "GET" && path.includes("/facilities/") && path.endsWith("/stock")) {
      const facilityId = event.pathParameters?.id;
      if (!facilityId) {
        return badRequest("Missing facility id parameter");
      }

      const items = await queryAll<BloodUnit & { GSI2PK: string; GSI2SK: string }>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": `FACILITY#${facilityId}#STOCK`,
        },
        scanForward: true, // Soonest first
      });

      const response: StockUnitResponse[] = items.map((u) => ({
        ...u,
        hoursRemaining: Math.round(hoursBetween(now, u.expiresAt) * 10) / 10,
      }));

      return ok(response);
    }

    // 2. GET /units/:id
    if (method === "GET" && event.pathParameters?.id) {
      const unitId = event.pathParameters.id;
      const key = unitKey(unitId);
      const unit = await getItem<BloodUnit>(key.PK, key.SK);
      if (!unit) {
        return notFound(`Unit not found: ${unitId}`);
      }
      return ok({
        ...unit,
        hoursRemaining: Math.round(hoursBetween(now, unit.expiresAt) * 10) / 10,
      });
    }

    return notFound("Route not found");
  },
);
