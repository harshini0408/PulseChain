import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomBytes } from "node:crypto";
import {
  createRequisitionSchema,
  hospitalReqsGsi2,
  isoNow,
  openReqGsi1,
  openReqPartition,
  reqsPartition,
  type Requisition,
  type WithKeys,
  type Component,
} from "@pulsechain/shared";
import { putItem, queryAll } from "../lib/db.js";
import { badRequest, ok, withErrors } from "../lib/http.js";
import { writeAuditEvent } from "../lib/audit.js";
import { getCallerContext } from "../lib/auth.js";

function generateReqId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `REQ-${ts}-${rand}`;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const query = event.queryStringParameters || {};
    const auth = getCallerContext(event);

    // -------------------------------------------------------------------------
    // POST /requisitions — Create a standing/emergency blood requisition
    // -------------------------------------------------------------------------
    if (method === "POST") {
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = createRequisitionSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const input = parseResult.data;
      const reqId = generateReqId();
      const now = isoNow();

      const pk = `REQ#${reqId}`;
      const sk = "META";
      const gsi1 = openReqGsi1(input.component, input.bloodGroup, input.neededBy);
      const gsi2 = hospitalReqsGsi2(input.hospitalId, input.neededBy);

      const requisition: Requisition = {
        reqId,
        hospitalId: input.hospitalId,
        component: input.component,
        bloodGroup: input.bloodGroup,
        unitsRequested: input.unitsRequested,
        unitsFilled: 0,
        urgency: input.urgency,
        neededBy: input.neededBy,
        status: "OPEN",
        source: input.rawText ? "PARSED" : "MANUAL",
        rawText: input.rawText,
        createdAt: now,
      };

      const dbItem: WithKeys<Requisition> & Requisition = {
        PK: pk,
        SK: sk,
        ...gsi1,
        ...gsi2,
        entityType: "Requisition",
        ...requisition,
      };

      await putItem(dbItem);

      await writeAuditEvent({
        eventType: "REQUISITION_CREATED",
        subjectType: "REQUISITION",
        subjectId: reqId,
        actorFacilityId: input.hospitalId,
        details: {
          component: input.component,
          bloodGroup: input.bloodGroup,
          unitsRequested: input.unitsRequested,
          urgency: input.urgency,
          neededBy: input.neededBy,
        },
      });

      return ok(requisition, 201);
    }

    // -------------------------------------------------------------------------
    // GET /requisitions — Query active requisitions
    // -------------------------------------------------------------------------
    if (method === "GET") {
      const hospitalId = query.hospitalId || (auth.role === "HOSPITAL" ? auth.facilityId : undefined);

      if (hospitalId) {
        const items = await queryAll<Requisition & Record<string, any>>({
          indexName: "GSI2",
          keyCondition: "GSI2PK = :pk",
          values: {
            ":pk": reqsPartition(hospitalId),
          },
        });

        const clean = items.map((item) => {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
          return rest as Requisition;
        });

        return ok(clean);
      }

      if (query.component) {
        const comp = query.component.toUpperCase() as Component;
        const items = await queryAll<Requisition & Record<string, any>>({
          indexName: "GSI1",
          keyCondition: "GSI1PK = :pk",
          values: {
            ":pk": openReqPartition(comp),
          },
        });

        const clean = items.map((item) => {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
          return rest as Requisition;
        });

        return ok(clean);
      }

      // Default: fetch open requisitions for all components
      const components: Component[] = ["PLATELETS", "RBC", "PLASMA"];
      const allResults: Requisition[] = [];

      for (const comp of components) {
        const items = await queryAll<Requisition & Record<string, any>>({
          indexName: "GSI1",
          keyCondition: "GSI1PK = :pk",
          values: {
            ":pk": openReqPartition(comp),
          },
        });

        for (const item of items) {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
          allResults.push(rest as Requisition);
        }
      }

      return ok(allResults);
    }

    return badRequest(`Unsupported method: ${method}`);
  }
);
