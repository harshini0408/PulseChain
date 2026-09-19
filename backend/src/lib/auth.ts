/**
 * backend/src/lib/auth.ts
 *
 * Auth helper extracting facilityId and user role from Cognito JWT claims.
 * Never trusts facilityId provided in the request body.
 */

import type { APIGatewayProxyEventV2 } from "aws-lambda";

export interface CallerContext {
  facilityId: string | null;
  role: string | null;
  userId: string | null;
}

export function getCallerContext(event: APIGatewayProxyEventV2): CallerContext {
  const claims = (event.requestContext as any)?.authorizer?.jwt?.claims as
    | Record<string, any>
    | undefined;

  let facilityId =
    claims?.["custom:facilityId"] ??
    claims?.["facilityId"] ??
    null;

  let role =
    claims?.["custom:role"] ??
    claims?.["role"] ??
    (Array.isArray(claims?.["cognito:groups"])
      ? claims?.["cognito:groups"][0]
      : claims?.["cognito:groups"]) ??
    null;

  let userId =
    claims?.["sub"] ??
    claims?.["username"] ??
    null;

  // Fallback to decode Authorization Bearer token if claims not pre-populated by authorizer
  const authHeader = event.headers?.["authorization"] ?? event.headers?.["Authorization"];
  if ((!facilityId || !role) && authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (!facilityId) {
          facilityId = payload["custom:facilityId"] ?? payload["facilityId"] ?? null;
        }
        if (!role) {
          role =
            payload["custom:role"] ??
            payload["role"] ??
            (Array.isArray(payload["cognito:groups"])
              ? payload["cognito:groups"][0]
              : payload["cognito:groups"]) ??
            null;
        }
        if (!userId) {
          userId = payload["sub"] ?? payload["username"] ?? null;
        }
      }
    } catch {
      // ignore invalid bearer tokens
    }
  }

  // Fallback to dev/test headers if still not determined
  if (!facilityId) {
    facilityId =
      event.headers?.["x-facility-id"] ??
      event.headers?.["X-Facility-Id"] ??
      null;
  }
  if (!role) {
    role =
      event.headers?.["x-user-role"] ??
      event.headers?.["x-role"] ??
      event.headers?.["X-User-Role"] ??
      null;
  }
  if (!userId) {
    userId =
      event.headers?.["x-user-id"] ??
      event.headers?.["X-User-Id"] ??
      null;
  }

  return { facilityId, role, userId };
}

export function requireCallerFacility(event: APIGatewayProxyEventV2): string {
  const ctx = getCallerContext(event);
  if (!ctx.facilityId) {
    throw new Error("Unauthorized: caller facilityId could not be determined from claims");
  }
  return ctx.facilityId;
}
