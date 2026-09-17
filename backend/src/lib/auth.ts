import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { Role } from "@pulsechain/shared";

export interface AuthContext {
  facilityId: string;
  role: Role;
  userId?: string;
  email?: string;
}

export function getAuthContext(event: APIGatewayProxyEventV2): AuthContext {
  const headers = event.headers || {};
  
  // 1. Check custom demo headers (case-insensitive fallback)
  const headerFacId =
    headers["x-facility-id"] ||
    headers["X-Facility-Id"] ||
    headers["x-facilityid"];
  const headerRole = (
    headers["x-role"] ||
    headers["X-Role"] ||
    "HOSPITAL"
  ).toUpperCase() as Role;

  // 2. Check Cognito JWT claims if available
  const jwtClaims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (jwtClaims) {
    const facilityId =
      jwtClaims["custom:facilityId"] ||
      jwtClaims["facilityId"] ||
      headerFacId ||
      "FAC_DEFAULT";
    const role = (
      jwtClaims["custom:role"] ||
      jwtClaims["role"] ||
      headerRole ||
      "HOSPITAL"
    ) as Role;

    return {
      facilityId,
      role,
      userId: jwtClaims.sub,
      email: jwtClaims.email,
    };
  }

  // 3. Demo fallback defaults
  return {
    facilityId: headerFacId || "FAC_DEFAULT",
    role: headerRole,
    userId: "demo-user",
    email: "demo@pulsechain.org",
  };
}
