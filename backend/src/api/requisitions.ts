/**
 * backend/src/api/requisitions.ts
 *
 * Requisition endpoints:
 * - GET /requisitions?hospitalId=<id> (GSI2 FACILITY#<id>#REQS)
 * - GET /requisitions?status=OPEN (GSI1 OPENREQ#<component>)
 * - POST /requisitions (validate input, write REQUISITION item, REQUISITION_CREATED audit event, start RequisitionEscalationStateMachine)
 */

import { randomUUID } from "crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  isoNow,
  requisitionKey,
  openReqGsi1,
  hospitalReqsGsi2,
  reqsPartition,
  openReqPartition,
  createRequisitionSchema,
  COMPONENTS,
  type Component,
  type Requisition,
} from "@pulsechain/shared";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { putItem, queryAll } from "../lib/db.js";
import { badRequest, ok, withErrors } from "../lib/http.js";
import { writeAuditEvent } from "../lib/audit.js";
import { getCallerContext } from "../lib/auth.js";
import { recordRequisitionOpen } from "../lib/stats.js";

function toRequisition(item: Record<string, any>): Requisition {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, _tag, ...rest } = item;
  return rest as Requisition;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const now = isoNow();

    // ─── 1. GET /requisitions ─────────────────────────────────────────────
    if (method === "GET") {
      const q = event.queryStringParameters ?? {};
      const hospitalId = q.hospitalId;
      const status = q.status;

      // Access pattern #10: Hospital's own requisitions via GSI2
      if (hospitalId) {
        const items = await queryAll<Record<string, any>>({
          indexName: "GSI2",
          keyCondition: "GSI2PK = :pk",
          values: {
            ":pk": reqsPartition(hospitalId),
          },
        });

        // Newest first
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return ok(items.map(toRequisition));
      }

      // Access pattern #8: Open requisitions via GSI1 OPENREQ#<component>
      if (status === "OPEN") {
        const compParam = q.component;
        const comps: Component[] =
          compParam && COMPONENTS.includes(compParam as Component)
            ? [compParam as Component]
            : ["PLATELETS", "RBC", "PLASMA"];

        const results = await Promise.all(
          comps.map((c) =>
            queryAll<Record<string, any>>({
              indexName: "GSI1",
              keyCondition: "GSI1PK = :pk",
              values: {
                ":pk": openReqPartition(c),
              },
            }),
          ),
        );

        const items = results.flat();
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return ok(items.map(toRequisition));
      }

      // Fallback: check caller context
      const caller = getCallerContext(event);
      if (caller.facilityId) {
        const items = await queryAll<Record<string, any>>({
          indexName: "GSI2",
          keyCondition: "GSI2PK = :pk",
          values: {
            ":pk": reqsPartition(caller.facilityId),
          },
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return ok(items.map(toRequisition));
      }

      // If coordinator or no filter provided, list open requisitions across components
      const results = await Promise.all(
        (["PLATELETS", "RBC", "PLASMA"] as Component[]).map((c) =>
          queryAll<Record<string, any>>({
            indexName: "GSI1",
            keyCondition: "GSI1PK = :pk",
            values: {
              ":pk": openReqPartition(c),
            },
          }),
        ),
      );
      const items = results.flat();
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return ok(items.map(toRequisition));
    }

    // ─── 2. POST /requisitions ────────────────────────────────────────────
    if (method === "POST") {
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      } catch {
        return badRequest("Malformed JSON in request body");
      }

      const parseRes = createRequisitionSchema.safeParse(parsedBody);
      if (!parseRes.success) {
        const issues = parseRes.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        return badRequest(`Validation failed: ${issues}`);
      }

      const input = parseRes.data;
      const reqId = `RQ${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`;

      const requisitionItem: Record<string, any> = {
        ...requisitionKey(reqId),
        ...openReqGsi1(input.component, input.bloodGroup, input.neededBy),
        ...hospitalReqsGsi2(input.hospitalId, input.neededBy),
        entityType: "REQUISITION",
        reqId,
        hospitalId: input.hospitalId,
        component: input.component,
        bloodGroup: input.bloodGroup,
        unitsRequested: input.unitsRequested,
        unitsFilled: 0,
        urgency: input.urgency,
        neededBy: input.neededBy,
        status: "OPEN",
        source: input.source,
        createdAt: now,
      };

      if (input.rawText) {
        requisitionItem.rawText = input.rawText;
      }

      // Persist the REQUISITION item
      await putItem(requisitionItem);

      // Block 5: increment the daily STATS open-requisition counter
      void recordRequisitionOpen(now).catch((e) =>
        console.warn("[requisitions] stats counter failed:", e),
      );

      // Write REQUISITION_CREATED audit event
      await writeAuditEvent({
        eventType: "REQUISITION_CREATED",
        subjectType: "REQUISITION",
        subjectId: reqId,
        actorFacilityId: input.hospitalId,
        timestamp: now,
        details: {
          component: input.component,
          bloodGroup: input.bloodGroup,
          unitsRequested: input.unitsRequested,
          urgency: input.urgency,
          neededBy: input.neededBy,
          source: input.source,
          ...(input.rawText ? { rawText: input.rawText } : {}),
        },
      });

      // Start RequisitionEscalationStateMachine execution if configured
      const stateMachineArn = process.env.REQUISITION_ESCALATION_STATE_MACHINE_ARN;
      if (stateMachineArn) {
        try {
          const sfn = new SFNClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
          await sfn.send(
            new StartExecutionCommand({
              stateMachineArn,
              name: `ReqEsc-${reqId}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80),
              input: JSON.stringify({
                requisitionId: reqId,
                reqId,
                facilityId: input.hospitalId,
                hospitalId: input.hospitalId,
                component: input.component,
                bloodGroup: input.bloodGroup,
                unitsRequested: input.unitsRequested,
                urgency: input.urgency,
                neededBy: input.neededBy,
                now,
              }),
            }),
          );
        } catch (sfnErr: any) {
          console.warn(`[requisitions] Step Functions start failed: ${sfnErr.message}`);
        }
      }

      return ok(toRequisition(requisitionItem), 201);
    }

    return badRequest("Route not supported");
  },
);
