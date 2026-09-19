/**
 * backend/src/api/pools.ts
 *
 * Coordinator donor pool endpoints:
 * - GET /pools: list all donor pools from GSI1
 * - GET /pools/:id: get single donor pool by ID
 * - POST /pools: register a new coordinator-managed donor pool with derived registered count
 */

import { randomUUID } from "crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  poolKey,
  poolsGsi1,
  createDonorPoolSchema,
  type DonorPool,
  type BloodGroup,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { badRequest, notFound, ok, withErrors } from "../lib/http.js";

function toPool(item: Record<string, any>): DonorPool {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...rest } = item;
  return rest as DonorPool;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const id = event.pathParameters?.id;

    // ── 1. GET /pools or GET /pools/:id ─────────────────────────────────────
    if (method === "GET") {
      if (id) {
        const keys = poolKey(id);
        const item = await getItem(keys.PK, keys.SK);
        if (!item) {
          return notFound(`Pool not found: ${id}`);
        }
        return ok(toPool(item));
      }

      const items = await queryAll({
        indexName: "GSI1",
        keyCondition: "GSI1PK = :pk",
        values: {
          ":pk": "POOLS",
        },
      });

      return ok(items.map(toPool));
    }

    // ── 2. POST /pools ──────────────────────────────────────────────────────
    if (method === "POST") {
      let raw: unknown;
      try {
        raw = JSON.parse(event.body || "{}");
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = createDonorPoolSchema.safeParse(raw);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return badRequest(`Validation failed: ${issues}`);
      }

      const data = parseResult.data;
      const groupCounts = data.groupCounts as Partial<Record<BloodGroup, number>>;

      // Strictly derived: registered total must equal the sum of groupCounts
      const registered = Object.values(groupCounts).reduce(
        (sum, count) => sum + (typeof count === "number" && count > 0 ? count : 0),
        0,
      );

      const poolId = `POOL_${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
      const keys = poolKey(poolId);
      const gsi1 = poolsGsi1(poolId);

      const poolItem = {
        ...keys,
        ...gsi1,
        entityType: "DONOR_POOL",
        poolId,
        name: data.name,
        poolType: data.poolType,
        city: data.city || "Coimbatore",
        lat: data.lat,
        lng: data.lng,
        registered,
        groupCounts,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        lastMobilisedAt: null,
      };

      await putItem(poolItem);
      return ok(toPool(poolItem), 201);
    }

    return notFound("Route not found");
  },
);
