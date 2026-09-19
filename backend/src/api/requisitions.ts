import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomBytes } from "node:crypto";
import {
  createRequisitionSchema,
  hospitalReqsGsi2,
  idempotencyKey,
  isoNow,
  openReqGsi1,
  openReqPartition,
  reqsPartition,
  type Requisition,
  type WithKeys,
  type Component,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll, updateItem, transact } from "../lib/db.js";
import { badRequest, conflict, forbidden, notFound, ok, withErrors } from "../lib/http.js";
import { writeAuditEvent } from "../lib/audit.js";
import { getCallerContext } from "../lib/auth.js";
import { SFNClient, StartExecutionCommand, StopExecutionCommand } from "@aws-sdk/client-sfn";
import { searchRequisitionInventory } from "../workers/requisition-search.js";
import { handler as donorTierHandler } from "../workers/donor-tier.js";
import { transitionReservedToAvailable } from "../lib/transitions.js";
import {
  unitKey,
  facilityKey,
  getCompatibility,
  type BloodUnit,
  type Facility,
  type CommunityAlert,
  type AuditEvent,
  type SecuredUnitSummary,
} from "@pulsechain/shared";

function generateReqId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `REQ-${ts}-${rand}`;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.rawPath || event.requestContext.http.path;
    const query = event.queryStringParameters || {};
    const auth = getCallerContext(event);

    const isCancelRoute =
      method === "POST" &&
      (path.endsWith("/cancel") || event.routeKey?.includes("/cancel"));

    // -------------------------------------------------------------------------
    // POST /requisitions — Create a persistent requisition
    // -------------------------------------------------------------------------
    if (method === "POST" && !isCancelRoute) {
      // 1. Authorization & Role Check
      if (!auth.role || (auth.role !== "HOSPITAL" && auth.role !== "COORDINATOR")) {
        return forbidden("Only authorized institutional facilities (HOSPITAL) can create requisitions");
      }
      if (!auth.facilityId) {
        return forbidden("Caller facility identity could not be verified from token");
      }
      const callerFacilityId = auth.facilityId;

      // 2. Request body parsing
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      // 3. Schema validation
      const parseResult = createRequisitionSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const input = parseResult.data;

      // 4. Critical: Do not trust facilityId in request body if mismatched with authenticated caller
      const requestedFacilityId = input.facilityId || input.hospitalId;
      if (requestedFacilityId && requestedFacilityId !== callerFacilityId) {
        return forbidden("Facility mismatch: cannot create requisition for another facility");
      }

      const targetRequiredBy = input.requiredBy || input.neededBy!;
      const now = isoNow();

      // 5. Idempotency Check
      const idempotencyHeader =
        event.headers?.["idempotency-key"] ||
        event.headers?.["Idempotency-Key"] ||
        event.headers?.["IDEMPOTENCY-KEY"];

      if (idempotencyHeader) {
        const idempRecordKey = idempotencyKey(callerFacilityId, idempotencyHeader);
        const existingIdemp = await getItem<{
          PK: string;
          SK: string;
          reqId: string;
          facilityId: string;
        }>(idempRecordKey.PK, idempRecordKey.SK);

        if (existingIdemp?.reqId) {
          const existingReq = await getItem<WithKeys<Requisition>>(`REQ#${existingIdemp.reqId}`, "META");
          if (existingReq) {
            const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = existingReq;
            return ok(clean, 200);
          }
        }
      }

      // 6. Generate Requisition Domain Entity
      const reqId = generateReqId();
      const pk = `REQ#${reqId}`;
      const sk = "META";
      const gsi1 = openReqGsi1(input.component, input.bloodGroup, targetRequiredBy);
      const gsi2 = hospitalReqsGsi2(callerFacilityId, targetRequiredBy);

      const requisition: Requisition = {
        id: reqId,
        reqId,
        facilityId: callerFacilityId,
        hospitalId: callerFacilityId,
        component: input.component,
        bloodGroup: input.bloodGroup,
        unitsRequested: input.unitsRequested,
        unitsFulfilled: 0,
        unitsFilled: 0,
        urgency: input.urgency,
        requiredBy: targetRequiredBy,
        neededBy: targetRequiredBy,
        status: "OPEN",
        source: input.source ?? (input.rawText ? "PARSED" : "MANUAL"),
        rawText: input.rawText,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId ?? callerFacilityId,
      };

      const dbItem: WithKeys<Requisition> & Requisition = {
        PK: pk,
        SK: sk,
        ...gsi1,
        ...gsi2,
        entityType: "Requisition",
        ...requisition,
      };

      // 7. Persist atomically (with idempotency record if provided)
      if (idempotencyHeader) {
        const idempRecordKey = idempotencyKey(callerFacilityId, idempotencyHeader);
        const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours TTL

        try {
          await transact([
            {
              Put: {
                Item: dbItem,
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                Item: {
                  ...idempRecordKey,
                  entityType: "IdempotencyKey",
                  reqId,
                  facilityId: callerFacilityId,
                  createdAt: now,
                  ttl,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ]);
        } catch (err: any) {
          // If transaction failed due to conditional check on idempotency key,
          // fetch and return the concurrent winner's requisition
          const isConditionalCancel =
            err.name === "TransactionCanceledException" &&
            err.CancellationReasons?.some((r: any) => r.Code === "ConditionalCheckFailed");

          if (isConditionalCancel) {
            const existingIdemp = await getItem<{ reqId: string }>(idempRecordKey.PK, idempRecordKey.SK);
            if (existingIdemp?.reqId) {
              const existingReq = await getItem<WithKeys<Requisition>>(`REQ#${existingIdemp.reqId}`, "META");
              if (existingReq) {
                const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = existingReq;
                return ok(clean, 200);
              }
            }
          }
          throw err;
        }
      } else {
        await putItem(dbItem, "attribute_not_exists(PK)");
      }

      // 8. Write Audit Event
      await writeAuditEvent({
        eventType: "REQUISITION_CREATED",
        subjectType: "REQUISITION",
        subjectId: reqId,
        actorFacilityId: callerFacilityId,
        details: {
          requisitionId: reqId,
          facilityId: callerFacilityId,
          actor: auth.userId ?? callerFacilityId,
          source: requisition.source,
          component: input.component,
          bloodGroup: input.bloodGroup,
          unitsRequested: input.unitsRequested,
          urgency: input.urgency,
          requiredBy: targetRequiredBy,
        },
      });

      // 9. Start Step Function RequisitionEscalationStateMachine
      let executionArn: string | undefined;
      const sfnArn = process.env.REQUISITION_ESCALATION_STATE_MACHINE_ARN;

      if (sfnArn) {
        try {
          const sfn = new SFNClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
          const executionName = `ReqEsc-${reqId}`.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80);
          const sfnRes = await sfn.send(
            new StartExecutionCommand({
              stateMachineArn: sfnArn,
              name: executionName,
              input: JSON.stringify({
                requisitionId: reqId,
                reqId: reqId,
                facilityId: callerFacilityId,
                hospitalId: callerFacilityId,
                component: input.component,
                bloodGroup: input.bloodGroup,
                unitsRequested: input.unitsRequested,
                urgency: input.urgency,
                requiredBy: targetRequiredBy,
                neededBy: targetRequiredBy,
              }),
            })
          );
          executionArn = sfnRes.executionArn;
        } catch (sfnErr: any) {
          console.error(`[requisitions] Failed to start Step Function execution:`, sfnErr);
          await putItem({
            ...dbItem,
            status: "SUBMITTED",
            failureReason: `Step Functions start failed: ${sfnErr.message}`,
            updatedAt: now,
          });
          await writeAuditEvent({
            eventType: "REQUISITION_EXHAUSTED",
            subjectType: "REQUISITION",
            subjectId: reqId,
            actorFacilityId: callerFacilityId,
            details: {
              error: sfnErr.message,
              stage: "STATE_MACHINE_START",
            },
          });
          return ok(
            {
              ...requisition,
              failureReason: `Step Functions start failed: ${sfnErr.message}`,
            },
            201
          );
        }
      } else {
        // Fallback for local testing / demo mode when SFN ARN is not injected via environment
        executionArn = `arn:aws:states:ap-south-1:123456789012:execution:PulseChain-RequisitionEscalation:ReqEsc-${reqId}`;
      }

      if (executionArn) {
        requisition.executionArn = executionArn;
        await putItem({
          ...dbItem,
          executionArn,
          updatedAt: now,
        });

        await writeAuditEvent({
          eventType: "REQUISITION_ESCALATION_STARTED",
          subjectType: "REQUISITION",
          subjectId: reqId,
          actorFacilityId: callerFacilityId,
          details: {
            requisitionId: reqId,
            executionArn,
            component: input.component,
            bloodGroup: input.bloodGroup,
            unitsRequested: input.unitsRequested,
            urgency: input.urgency,
          },
        });
      }

      // Local / test mode synchronous execution if enabled
      if (process.env.RUN_LOCAL_ESCALATION === "true") {
        try {
          const searchRes = await searchRequisitionInventory({
            requisitionId: reqId,
            facilityId: callerFacilityId,
            component: input.component,
            bloodGroup: input.bloodGroup,
            unitsRequested: input.unitsRequested,
            urgency: input.urgency,
            requiredBy: targetRequiredBy,
          });

          if (!searchRes.filled) {
            await donorTierHandler({
              reqId,
              unitsRemaining: searchRes.unitsRemaining,
              unitsRequested: input.unitsRequested,
              unitsFulfilled: searchRes.unitsFulfilled,
            });
          }

          const refreshedReq = await getItem<WithKeys<Requisition>>(`REQ#${reqId}`, "META");
          if (refreshedReq) {
            const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = refreshedReq;
            return ok(clean, 201);
          }
        } catch (localErr) {
          console.warn("[requisitions] Local escalation execution error:", localErr);
        }
      }

      return ok(requisition, 201);
    }

    // -------------------------------------------------------------------------
    // POST /requisitions/{id}/cancel — Cancel an active requisition
    // -------------------------------------------------------------------------
    if (isCancelRoute) {
      if (!auth.role || (auth.role !== "HOSPITAL" && auth.role !== "COORDINATOR")) {
        return forbidden("Only authorized institutional facilities (HOSPITAL) can cancel requisitions");
      }
      if (!auth.facilityId) {
        return forbidden("Caller facility identity could not be verified from token");
      }

      const cancelReqId =
        event.pathParameters?.id ||
        event.pathParameters?.reqId ||
        path.split("/")[2];

      if (!cancelReqId) {
        return badRequest("Missing requisition ID for cancellation");
      }

      const req = await getItem<WithKeys<Requisition> & Requisition>(
        `REQ#${cancelReqId}`,
        "META"
      );

      if (!req) {
        return notFound(`Requisition not found: ${cancelReqId}`);
      }

      const reqFacilityId = req.facilityId || req.hospitalId;
      if (auth.role !== "COORDINATOR" && reqFacilityId !== auth.facilityId) {
        return forbidden("Access denied: cannot cancel requisition belonging to another facility");
      }

      // Parse optional operational reason
      let cancelReason = "Cancelled by hospital";
      if (event.body) {
        try {
          const bodyObj = JSON.parse(event.body);
          if (bodyObj.reason && typeof bodyObj.reason === "string") {
            cancelReason = bodyObj.reason.trim();
          }
        } catch {
          // Ignore body parse errors if empty or non-JSON
        }
      }

      // Idempotency: If already CANCELLED, return 200 without duplicate side effects
      if (req.status === "CANCELLED") {
        const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = req;
        return ok({
          success: true,
          alreadyCancelled: true,
          requisition: clean,
          releasedReservationsCount: 0,
        });
      }

      // Check if already in terminal state where cancellation is invalid
      if (req.status === "EXPIRED" || req.status === "EXHAUSTED") {
        return conflict(`Cannot cancel requisition in terminal state: ${req.status}`);
      }

      // Check for irreversible physical dispatch states on associated units
      if (req.reservedUnitIds && req.reservedUnitIds.length > 0) {
        for (const uId of req.reservedUnitIds) {
          const u = await getItem<BloodUnit>(unitKey(uId).PK, unitKey(uId).SK);
          if (u && (u.status === "IN_TRANSIT" || u.status === "RECEIVED")) {
            return conflict(`Cannot cancel requisition: blood unit ${uId} has already entered ${u.status} state`);
          }
        }
      }

      const now = isoNow();

      // Audit: REQUISITION_CANCEL_REQUESTED
      await writeAuditEvent({
        eventType: "REQUISITION_CANCEL_REQUESTED",
        subjectType: "REQUISITION",
        subjectId: cancelReqId,
        actorFacilityId: auth.facilityId,
        details: {
          requisitionId: cancelReqId,
          facilityId: auth.facilityId,
          previousStatus: req.status,
          reason: cancelReason,
        },
      });

      // 1. Release reserved units safely back to regional inventory
      let releasedCount = 0;
      if (req.reservedUnitIds && req.reservedUnitIds.length > 0) {
        for (const uId of req.reservedUnitIds) {
          const released = await transitionReservedToAvailable({
            unitId: uId,
            requisitionId: cancelReqId,
            actorFacilityId: auth.facilityId,
            reason: cancelReason,
            timestamp: now,
          });
          if (released) {
            releasedCount++;
            await writeAuditEvent({
              eventType: "UNIT_RESERVATION_RELEASED",
              subjectType: "REQUISITION",
              subjectId: cancelReqId,
              actorFacilityId: auth.facilityId,
              details: {
                unitId: uId,
                requisitionId: cancelReqId,
                reason: cancelReason,
                releasedAt: now,
              },
            });
          }
        }
      }

      // 2. Stop Step Function execution if active
      if (req.executionArn) {
        try {
          const sfn = new SFNClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
          await sfn.send(
            new StopExecutionCommand({
              executionArn: req.executionArn,
              cause: cancelReason,
            })
          );
        } catch (sfnErr: any) {
          console.warn("[requisitions] Step Functions stop error (safe to ignore if finished or mock):", sfnErr.message);
        }

        await writeAuditEvent({
          eventType: "REQUISITION_ESCALATION_CANCELLED",
          subjectType: "REQUISITION",
          subjectId: cancelReqId,
          actorFacilityId: auth.facilityId,
          details: {
            requisitionId: cancelReqId,
            executionArn: req.executionArn,
            reason: cancelReason,
          },
        });
      }

      // 3. Cancel open community alerts
      const alerts = await queryAll<CommunityAlert & Record<string, any>>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": `REQ#${cancelReqId}#ALERTS`,
        },
      });

      for (const alert of alerts) {
        if (alert.status !== "CLOSED" && alert.status !== "CANCELLED") {
          try {
            await updateItem({
              Key: { PK: alert.PK, SK: alert.SK },
              UpdateExpression: "SET #status = :cancelledStatus, updatedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":cancelledStatus": "CANCELLED", ":now": now },
            });
            await writeAuditEvent({
              eventType: "COMMUNITY_ALERT_CANCELLED",
              subjectType: "REQUISITION",
              subjectId: cancelReqId,
              actorFacilityId: auth.facilityId,
              details: {
                reqId: cancelReqId,
                communityId: alert.communityId,
                reason: cancelReason,
              },
            });
          } catch (alertErr: any) {
            console.warn(`[requisitions] Failed to cancel alert for community ${alert.communityId}:`, alertErr.message);
          }
        }
      }

      // 4. Update Requisition to CANCELLED in DynamoDB
      const prevFulfilled = req.unitsFulfilled ?? req.unitsFilled ?? 0;
      const updatedFulfilled = Math.max(0, prevFulfilled - releasedCount);

      const updatedReq: WithKeys<Requisition> & Requisition = {
        ...req,
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: auth.userId ?? auth.facilityId,
        cancelReason,
        unitsRemaining: 0,
        unitsFulfilled: updatedFulfilled,
        unitsFilled: updatedFulfilled,
        updatedAt: now,
      };

      await putItem(updatedReq);

      // Audit: REQUISITION_CANCELLED
      await writeAuditEvent({
        eventType: "REQUISITION_CANCELLED",
        subjectType: "REQUISITION",
        subjectId: cancelReqId,
        actorFacilityId: auth.facilityId,
        details: {
          requisitionId: cancelReqId,
          facilityId: auth.facilityId,
          actor: auth.userId ?? auth.facilityId,
          previousStatus: req.status,
          newStatus: "CANCELLED",
          timestamp: now,
          reason: cancelReason,
          numberOfReservationsReleased: releasedCount,
        },
      });

      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = updatedReq;
      return ok({
        success: true,
        alreadyCancelled: false,
        requisition: clean,
        releasedReservationsCount: releasedCount,
      });
    }

    // -------------------------------------------------------------------------
    // GET /requisitions/{id}/events — Fetch operational timeline for a requisition
    // -------------------------------------------------------------------------
    const isEventsRoute =
      method === "GET" &&
      (path.endsWith("/events") || event.routeKey?.includes("/events"));

    if (isEventsRoute) {
      if (!auth.facilityId) {
        return forbidden("Unauthorized: valid institutional credentials required");
      }

      const eventsReqId =
        event.pathParameters?.id ||
        event.pathParameters?.reqId ||
        path.split("/")[2];

      if (!eventsReqId) {
        return badRequest("Missing requisition ID");
      }

      const req = await getItem<WithKeys<Requisition> & Requisition>(
        `REQ#${eventsReqId}`,
        "META"
      );

      if (!req) {
        return notFound(`Requisition not found: ${eventsReqId}`);
      }

      const reqFacilityId = req.facilityId || req.hospitalId;
      if (auth.role !== "COORDINATOR" && reqFacilityId !== auth.facilityId) {
        return forbidden("Access denied: requisition belongs to another facility");
      }

      const auditItems = await queryAll<AuditEvent & Record<string, any>>({
        keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
        values: {
          ":pk": `REQ#${eventsReqId}`,
          ":skPrefix": "AUDIT#",
        },
      });

      // Format clean hospital-facing timeline events
      const timeline = auditItems.map((a) => {
        const details: any = a.details || {};
        let title = a.eventType.replace(/_/g, " ");
        let summary = "Operational lifecycle event recorded.";

        switch (a.eventType) {
          case "REQUISITION_CREATED":
            title = "Requisition Created";
            summary = `Requested ${details.unitsRequested ?? req.unitsRequested} units of ${details.component ?? req.component} (${details.bloodGroup ?? req.bloodGroup}) with ${details.urgency ?? req.urgency} urgency.`;
            break;
          case "REQUISITION_ESCALATION_STARTED":
            title = "Escalation Engine Started";
            summary = "Automated requisition escalation state machine initiated regional inventory rescue.";
            break;
          case "REQUISITION_SEARCH_STARTED":
            title = "Regional Inventory Search Started";
            summary = "Scanning network blood centres for clinically compatible available units.";
            break;
          case "UNIT_RESERVATION_ATTEMPTED":
            title = "Reservation Attempted";
            summary = `Attempting reservation of compatible candidate unit ${a.subjectId}.`;
            break;
          case "UNIT_RESERVED":
            title = "Blood Unit Reserved";
            summary = `Clinically compatible unit ${a.subjectId} reserved from centre ${a.actorFacilityId || details.reservedByFacilityId || "regional inventory"}.`;
            break;
          case "UNIT_RESERVATION_REJECTED":
            title = "Candidate Contested";
            summary = `Candidate unit ${a.subjectId} was concurrently reserved by another request. Search continuing.`;
            break;
          case "REQUISITION_PARTIALLY_FULFILLED":
            title = "Partially Fulfilled";
            summary = `Secured ${details.unitsFulfilled} of ${details.unitsRequested} units. Remainder (${details.unitsRemaining}) escalating to donor tier.`;
            break;
          case "REQUISITION_FULFILLED":
            title = "Requisition Fulfilled";
            summary = `All ${details.unitsFulfilled ?? req.unitsRequested} requested units secured from institutional inventory.`;
            break;
          case "DONOR_ESCALATION_STARTED":
            title = "Community Escalation Activated";
            summary = `Institutional inventory insufficient. Mobilising community donor clusters for remaining ${details.unitsRemaining ?? req.unitsRemaining ?? "unfulfilled"} units.`;
            break;
          case "DONOR_TIER_TRIGGERED":
            title = "Community Coordinators Alerted";
            summary = `Dispatched alerts to ${details.communitiesCount ?? 0} community coordinator clusters in proximity.`;
            break;
          case "REQUISITION_CANCEL_REQUESTED":
            title = "Cancellation Requested";
            summary = `Hospital requested cancellation of this requisition. Reason: ${details.reason || "Operational update"}.`;
            break;
          case "UNIT_RESERVATION_RELEASED":
            title = "Unit Reservation Released";
            summary = `Reserved unit ${a.subjectId} safely released back into regional available inventory.`;
            break;
          case "COMMUNITY_ALERT_CANCELLED":
            title = "Community Alert Cancelled";
            summary = "Active community coordinator notification halted.";
            break;
          case "REQUISITION_ESCALATION_CANCELLED":
            title = "Escalation Workflow Cancelled";
            summary = "Automated escalation state machine execution stopped.";
            break;
          case "REQUISITION_CANCELLED":
            title = "Requisition Cancelled";
            summary = `Requisition cancelled. ${details.numberOfReservationsReleased ?? 0} unit reservation(s) returned to available stock.`;
            break;
          case "REQUISITION_EXHAUSTED":
            title = "Requisition Exhausted";
            summary = details.reason || "Regional inventory and community mobilization could not fulfill remaining demand.";
            break;
          case "REQUISITION_EXPIRED":
            title = "Requisition Expired";
            summary = "Required-by deadline passed before demand could be fully satisfied.";
            break;
        }

        return {
          eventId: a.eventId || a.SK?.replace("AUDIT#", ""),
          eventType: a.eventType,
          timestamp: a.timestamp,
          title,
          summary,
          details: a.details,
        };
      });

      // Sort timeline ascending (earliest to latest)
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return ok({ requisitionId: eventsReqId, events: timeline });
    }

    // -------------------------------------------------------------------------
    // GET /requisitions/{id} — Fetch single requisition by ID with secured units
    // -------------------------------------------------------------------------
    const pathReqId = event.pathParameters?.id || event.pathParameters?.reqId;
    if (method === "GET" && pathReqId && !isEventsRoute) {
      if (!auth.facilityId) {
        return forbidden("Unauthorized: valid institutional credentials required");
      }

      const item = await getItem<WithKeys<Requisition> & Record<string, any>>(
        `REQ#${pathReqId}`,
        "META"
      );

      if (!item) {
        return notFound(`Requisition not found: ${pathReqId}`);
      }

      // Enforce facility ownership (unless coordinator)
      const itemFacilityId = item.facilityId || item.hospitalId;
      if (auth.role !== "COORDINATOR" && itemFacilityId !== auth.facilityId) {
        return forbidden("Access denied: requisition belongs to another facility");
      }

      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...clean } = item;

      // Populate securedUnits with operational summary
      const securedUnits: SecuredUnitSummary[] = [];
      if (item.reservedUnitIds && Array.isArray(item.reservedUnitIds)) {
        for (const uId of item.reservedUnitIds) {
          const u = await getItem<BloodUnit & Record<string, any>>(unitKey(uId).PK, unitKey(uId).SK);
          if (u) {
            let facName = u.facilityId;
            try {
              const fac = await getItem<Facility & Record<string, any>>(facilityKey(u.facilityId).PK, facilityKey(u.facilityId).SK);
              if (fac?.name) facName = fac.name;
            } catch {}

            const compat = getCompatibility(item.component, u.bloodGroup, item.bloodGroup);
            securedUnits.push({
              unitId: u.unitId,
              component: u.component,
              bloodGroup: u.bloodGroup,
              facilityId: u.facilityId,
              facilityName: facName,
              status: u.status,
              reservedAt: u.reservedAt || item.createdAt,
              expiresAt: u.expiresAt,
              compatibilityLevel: compat.level,
              notes: compat.notes,
            });
          }
        }
      }

      clean.securedUnits = securedUnits;
      return ok(clean);
    }

    // -------------------------------------------------------------------------
    // GET /requisitions — Query requisitions with facility isolation
    // -------------------------------------------------------------------------
    if (method === "GET") {
      if (!auth.facilityId && auth.role !== "COORDINATOR") {
        return forbidden("Unauthorized: valid institutional credentials required");
      }

      // If caller is HOSPITAL, they can only query their own facility's requisitions
      if (auth.role === "HOSPITAL") {
        if (!auth.facilityId) {
          return forbidden("Caller facility identity could not be verified from token");
        }
        const callerFacilityId = auth.facilityId;

        if (query.hospitalId && query.hospitalId !== callerFacilityId) {
          return forbidden("Access denied: cannot query requisitions for another facility");
        }
        if (query.facilityId && query.facilityId !== callerFacilityId) {
          return forbidden("Access denied: cannot query requisitions for another facility");
        }

        const items = await queryAll<Requisition & Record<string, any>>({
          indexName: "GSI2",
          keyCondition: "GSI2PK = :pk",
          values: {
            ":pk": reqsPartition(callerFacilityId),
          },
        });

        const clean = items.map((item) => {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
          return {
            ...rest,
            id: rest.id || rest.reqId,
            facilityId: rest.facilityId || rest.hospitalId,
            unitsFulfilled: rest.unitsFulfilled ?? rest.unitsFilled ?? 0,
            requiredBy: rest.requiredBy || rest.neededBy,
          } as Requisition;
        });

        // Most recent first
        clean.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return ok(clean);
      }

      // COORDINATOR queries
      const targetFacilityId = query.hospitalId || query.facilityId;
      if (targetFacilityId) {
        const items = await queryAll<Requisition & Record<string, any>>({
          indexName: "GSI2",
          keyCondition: "GSI2PK = :pk",
          values: {
            ":pk": reqsPartition(targetFacilityId),
          },
        });

        const clean = items.map((item) => {
          const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
          return rest as Requisition;
        });
        clean.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        clean.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return ok(clean);
      }

      // Default for coordinator: fetch open requisitions across all components
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

      allResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return ok(allResults);
    }

    return badRequest(`Unsupported method: ${method}`);
  }
);
