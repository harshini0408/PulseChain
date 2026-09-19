/**
 * backend/src/api/units.ts
 *
 * Blood unit endpoints:
 * - GET /facilities/:id/stock (GSI2 stock query, sorted by expiry, computed hoursRemaining)
 * - GET /units/:id
 * - POST /units/batch (CSV import — blood centre only, up to 20 units per call)
 */

import { randomUUID } from "crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  unitKey,
  unitStockGsi2,
  unitQueueGsi1,
  hoursBetween,
  isoNow,
  BLOOD_GROUPS,
  COMPONENTS,
  type BloodGroup,
  type Component,
  type BloodUnit,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { badRequest, notFound, ok, withErrors } from "../lib/http.js";
import { writeAuditEvent } from "../lib/audit.js";

export interface StockUnitResponse extends BloodUnit {
  hoursRemaining: number;
}

/** Minimal shape expected per row from the CSV import */
interface BatchUnitInput {
  component: string;
  bloodGroup: string;
  volumeMl: number;
  valueInr: number;
  collectedAt: string;
  expiresAt: string;
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

    // 3. POST /units/batch  — CSV bulk import
    if (method === "POST" && path.endsWith("/units/batch")) {
      // Extract facilityId from the caller context header (set by API Gateway from JWT claims)
      const facilityId =
        event.headers?.["x-facility-id"] ||
        (event.requestContext as any)?.authorizer?.jwt?.claims?.["custom:facilityId"] ||
        null;

      if (!facilityId) {
        return badRequest("facilityId is required (must be authenticated as a blood centre)");
      }

      let body: unknown;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return badRequest("Malformed JSON body");
      }

      if (!Array.isArray((body as any)?.units)) {
        return badRequest("Request body must be { units: [...] }");
      }

      const rows: BatchUnitInput[] = (body as any).units;
      if (rows.length === 0) return badRequest("units array is empty");
      if (rows.length > 20) return badRequest("Maximum 20 units per batch import");

      const results: Array<{ unitId: string; status: "ok" | "error"; error?: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Validate required fields
        if (!COMPONENTS.includes(row.component as Component)) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: invalid component "${row.component}"` });
          continue;
        }
        if (!BLOOD_GROUPS.includes(row.bloodGroup as BloodGroup)) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: invalid bloodGroup "${row.bloodGroup}"` });
          continue;
        }
        const vol = Number(row.volumeMl);
        const val = Number(row.valueInr);
        if (!vol || vol <= 0) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: volumeMl must be positive` });
          continue;
        }
        if (!val || val < 0) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: valueInr must be non-negative` });
          continue;
        }
        const collectedAt = row.collectedAt;
        const expiresAt = row.expiresAt;
        if (!collectedAt || isNaN(Date.parse(collectedAt))) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: invalid collectedAt date` });
          continue;
        }
        if (!expiresAt || isNaN(Date.parse(expiresAt))) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: invalid expiresAt date` });
          continue;
        }
        if (new Date(expiresAt) <= new Date(now)) {
          results.push({ unitId: "", status: "error", error: `Row ${i + 1}: expiresAt is already in the past` });
          continue;
        }

        const component = row.component as Component;
        const bloodGroup = row.bloodGroup as BloodGroup;
        const unitId = `IMPORT_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
        const expiresAtIso = new Date(expiresAt).toISOString();
        const collectedAtIso = new Date(collectedAt).toISOString();

        const unitItem = {
          ...unitKey(unitId),
          ...unitQueueGsi1("AVAILABLE", component, expiresAtIso, unitId),
          ...unitStockGsi2(facilityId, expiresAtIso, unitId),
          entityType: "UNIT",
          unitId,
          facilityId,
          component,
          bloodGroup,
          volumeMl: vol,
          valueInr: val,
          collectedAt: collectedAtIso,
          expiresAt: expiresAtIso,
          status: "AVAILABLE" as const,
          version: 1,
        };

        try {
          await putItem(unitItem);
          await writeAuditEvent({
            eventType: "UNIT_LOGGED",
            subjectType: "UNIT",
            subjectId: unitId,
            actorFacilityId: facilityId,
            timestamp: now,
            details: { component, bloodGroup, volumeMl: vol, valueInr: val, source: "CSV_IMPORT" },
          });
          results.push({ unitId, status: "ok" });
        } catch (err: any) {
          results.push({ unitId, status: "error", error: `Row ${i + 1}: DB write failed — ${err.message}` });
        }
      }

      const successCount = results.filter((r) => r.status === "ok").length;
      return ok({ imported: successCount, total: rows.length, results }, 201);
    }

    return notFound("Route not found");
  },
);

