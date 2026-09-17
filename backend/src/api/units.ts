import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomBytes } from "node:crypto";
import {
  createUnitSchema,
  unitKey,
  unitQueueGsi1,
  unitStockGsi2,
  stockPartition,
  type BloodUnit,
  type WithKeys,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { badRequest, notFound, ok, withErrors } from "../lib/http.js";
import { writeAuditEvent } from "../lib/audit.js";
import { getAuthContext } from "../lib/auth.js";

function generateUnitId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `U-${ts}-${rand}`;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const pathParams = event.pathParameters || {};
    const auth = getAuthContext(event);

    // -------------------------------------------------------------------------
    // POST /units — Log a new blood unit
    // -------------------------------------------------------------------------
    if (method === "POST" && (path === "/units" || path.endsWith("/units"))) {
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = createUnitSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const input = parseResult.data;
      const unitId = generateUnitId();

      const keys = unitKey(unitId);
      const gsi1 = unitQueueGsi1("AVAILABLE", input.component, input.expiresAt, unitId);
      const gsi2 = unitStockGsi2(input.facilityId, input.expiresAt, unitId);

      const unit: BloodUnit = {
        unitId,
        facilityId: input.facilityId,
        component: input.component,
        bloodGroup: input.bloodGroup,
        volumeMl: input.volumeMl,
        valueInr: input.valueInr ?? 1500,
        collectedAt: input.collectedAt,
        expiresAt: input.expiresAt,
        status: "AVAILABLE",
        version: 1,
      };

      const dbItem: WithKeys<BloodUnit> & BloodUnit = {
        ...keys,
        ...gsi1,
        ...gsi2,
        entityType: "BloodUnit",
        ...unit,
      };

      await putItem(dbItem);

      await writeAuditEvent({
        eventType: "UNIT_LOGGED",
        subjectType: "UNIT",
        subjectId: unitId,
        actorFacilityId: input.facilityId || auth.facilityId,
        details: {
          component: input.component,
          bloodGroup: input.bloodGroup,
          volumeMl: input.volumeMl,
          expiresAt: input.expiresAt,
        },
      });

      return ok(unit, 201);
    }

    // -------------------------------------------------------------------------
    // GET /facilities/{id}/stock — List stock at a facility
    // -------------------------------------------------------------------------
    if (method === "GET" && pathParams.id && path.includes("/stock")) {
      const facilityId = pathParams.id;
      const partition = stockPartition(facilityId);

      const items = await queryAll<BloodUnit & Record<string, any>>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": partition,
        },
      });

      const cleanUnits: BloodUnit[] = items.map((item) => {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
        return rest as BloodUnit;
      });

      return ok(cleanUnits);
    }

    // -------------------------------------------------------------------------
    // GET /units/{id} — Single unit details + audit timeline
    // -------------------------------------------------------------------------
    if (method === "GET" && pathParams.id) {
      const unitId = pathParams.id;
      const keys = unitKey(unitId);

      const unit = await getItem<BloodUnit>(keys.PK, keys.SK);
      if (!unit) {
        return notFound(`Unit not found: ${unitId}`);
      }

      // Query timeline from audit events
      const auditItems = await queryAll({
        keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
        values: {
          ":pk": `UNIT#${unitId}`,
          ":skPrefix": "AUDIT#",
        },
      });

      const timeline = auditItems.map((item) => {
        const { PK, SK, GSI1PK, GSI1SK, entityType, ...rest } = item;
        return rest;
      });

      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...cleanUnit } = unit as any;

      return ok({
        unit: cleanUnit,
        timeline,
      });
    }

    return badRequest(`Unsupported route: ${method} ${path}`);
  }
);
