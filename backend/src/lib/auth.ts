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

  const facilityId =
    claims?.["custom:facilityId"] ??
    claims?.["facilityId"] ??
    null;

  const role =
    claims?.["custom:role"] ??
    claims?.["role"] ??
    (Array.isArray(claims?.["cognito:groups"])
      ? claims?.["cognito:groups"][0]
      : claims?.["cognito:groups"]) ??
    null;

  const userId =
    claims?.["sub"] ??
    claims?.["username"] ??
    null;

  return { facilityId, role, userId };
}

export function requireCallerFacility(event: APIGatewayProxyEventV2): string {
  const ctx = getCallerContext(event);
  if (!ctx.facilityId) {
    throw new Error("Unauthorized: caller facilityId could not be determined from claims");
  }
  return ctx.facilityId;
}
