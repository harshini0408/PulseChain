/**
 * backend/src/api/mobilisations.ts
 *
 * Public unauthenticated community mobilisation endpoints:
 * - GET  /mobilise/{token}: View safe mobilisation request summary
 * - POST /mobilise/{token}/acknowledge: Acknowledge mobilisation request atomically
 *
 * Security boundary:
 * - Completely unauthenticated (no Cognito token required)
 * - Protected by unpredictable, single-use, time-limited token
 * - Minimal public data exposure: reveals only safe operational request summary
 * - Atomic DynamoDB transaction ensures token status, pool update, and audit trail write together
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  isoNow,
  mobilisationKey,
  poolKey,
  type MobilisationRecord,
  type MobilisationSummary,
} from "@pulsechain/shared";
import { docClient, getItem, requireTableName, transact, type TransactItem } from "../lib/db.js";
import { badRequest, conflict, notFound, ok, withErrors } from "../lib/http.js";
import { buildAuditTransactItem } from "../lib/audit.js";

/** Extract strictly the safe summary fields exposed to the public link */
function toMobilisationSummary(item: MobilisationRecord): MobilisationSummary {
  return {
    token: item.token,
    poolId: item.poolId,
    poolName: item.poolName,
    hospitalName: item.hospitalName,
    hospitalCity: item.hospitalCity,
    component: item.component,
    bloodGroup: item.bloodGroup,
    unitsRequested: item.unitsRequested,
    urgency: item.urgency,
    neededBy: item.neededBy,
    status: item.status,
    expiresAt: item.expiresAt,
    acknowledgedAt: item.acknowledgedAt ?? null,
  };
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const token = event.pathParameters?.token?.trim();
    const now = isoNow();

    if (!token) {
      return badRequest("Missing mobilisation token");
    }

    const key = mobilisationKey(token);
    const item = await getItem<MobilisationRecord>(key.PK, key.SK);

    if (!item) {
      return notFound("Mobilisation request not found or invalid token");
    }

    // ── Explicit Expiry Check & State Transition ──────────────────────────
    const isExpired = new Date(item.expiresAt).getTime() <= new Date(now).getTime();
    if (isExpired && item.status === "PENDING") {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: requireTableName(),
            Key: key,
            UpdateExpression: "SET #status = :expired",
            ConditionExpression: "#status = :pending",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":expired": "EXPIRED",
              ":pending": "PENDING",
            },
          }),
        );
        item.status = "EXPIRED";
      } catch {
        // Concurrently updated
      }
    }

    // ── 1. GET /mobilise/{token} ──────────────────────────────────────────
    if (method === "GET") {
      return ok(toMobilisationSummary(item));
    }

    // ── 2. POST /mobilise/{token}/acknowledge ─────────────────────────────
    if (method === "POST") {
      if (item.status === "ACKNOWLEDGED") {
        return conflict("Mobilisation request has already been acknowledged");
      }

      if (item.status === "EXPIRED" || isExpired) {
        return badRequest("Mobilisation request has expired");
      }

      // Fully atomic DynamoDB transaction:
      // 1. Mobilisation token update (PENDING -> ACKNOWLEDGED) with condition
      // 2. Pool update (lastMobilisedAt = now, lastMobilisationStatus = ACKNOWLEDGED)
      // 3. MOBILISATION_ACKNOWLEDGED audit record write
      const mobUpdate: TransactItem = {
        Update: {
          Key: key,
          UpdateExpression: "SET #status = :ackStatus, acknowledgedAt = :ts",
          ConditionExpression: "#status = :pending AND expiresAt > :now",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":pending": "PENDING",
            ":ackStatus": "ACKNOWLEDGED",
            ":now": now,
            ":ts": now,
          },
        },
      };

      const poolKeys = poolKey(item.poolId);
      const poolUpdate: TransactItem = {
        Update: {
          Key: poolKeys,
          UpdateExpression: "SET lastMobilisedAt = :ts, lastMobilisationStatus = :ackStatus",
          ExpressionAttributeValues: {
            ":ts": now,
            ":ackStatus": "ACKNOWLEDGED",
          },
        },
      };

      const { transactItem: auditTransactItem } = buildAuditTransactItem({
        eventType: "MOBILISATION_ACKNOWLEDGED",
        subjectType: "REQUISITION",
        subjectId: item.requisitionId,
        actorFacilityId: item.hospitalId,
        timestamp: now,
        details: {
          token,
          poolId: item.poolId,
          poolName: item.poolName,
          component: item.component,
          bloodGroup: item.bloodGroup,
          unitsRequested: item.unitsRequested,
          acknowledgedAt: now,
        },
      });

      try {
        await transact([mobUpdate, poolUpdate, auditTransactItem]);
      } catch (err: any) {
        if (
          err.name === "TransactionCanceledException" ||
          err.message?.includes("ConditionalCheckFailed")
        ) {
          // Check if already acknowledged or expired
          const refreshed = await getItem<MobilisationRecord>(key.PK, key.SK);
          if (refreshed?.status === "ACKNOWLEDGED") {
            return conflict("Mobilisation request was already acknowledged");
          }
          if (refreshed?.status === "EXPIRED" || (refreshed && new Date(refreshed.expiresAt).getTime() <= new Date(now).getTime())) {
            return badRequest("Mobilisation request has expired");
          }
        }
        throw err;
      }

      item.status = "ACKNOWLEDGED";
      item.acknowledgedAt = now;

      return ok({
        ok: true,
        status: "ACKNOWLEDGED",
        acknowledgedAt: now,
        message: "Mobilisation request successfully acknowledged. Regional coordinator informed.",
        summary: toMobilisationSummary(item),
      });
    }

    return badRequest("Route not supported");
  },
);
