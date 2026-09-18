import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { Role } from "@pulsechain/shared";

export interface AuthContext {
  facilityId: string; // Generic scope ID: facilityId or communityId
  scopeId: string;
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
    headers["x-facilityid"] ||
    headers["x-community-id"] ||
    headers["x-communityid"];
  const headerRole = (
    headers["x-role"] ||
    headers["X-Role"] ||
    "HOSPITAL"
  ).toUpperCase() as Role;

  // 2. Check Cognito JWT claims if available
  const jwtClaims = (event.requestContext as any)?.authorizer?.jwt?.claims;
  if (jwtClaims) {
    const scopeId =
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
      facilityId: scopeId,
      scopeId,
      role,
      userId: jwtClaims.sub,
      email: jwtClaims.email,
    };
  }

  // 3. Demo fallback defaults
  const fallbackScopeId = headerFacId || "FAC_DEFAULT";
  return {
    facilityId: fallbackScopeId,
    scopeId: fallbackScopeId,
    role: headerRole,
    userId: "demo-user",
    email: "demo@pulsechain.org",
  };
}

export function isAuthorizedRole(auth: AuthContext, allowed: Role[]): boolean {
  return allowed.includes(auth.role);
}

export function isScopedTo(auth: AuthContext, requiredScopeId: string): boolean {
  if (auth.role === "COORDINATOR") return true; // Regional coordinator can view across network
  return auth.scopeId === requiredScopeId || auth.facilityId === requiredScopeId;
}

