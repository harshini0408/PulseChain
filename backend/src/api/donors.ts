import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomBytes } from "node:crypto";
import {
  createDonorSchema,
  deferDonorSchema,
  donorKey,
  donorGsi1,
  donorGsi2,
  computeNextEligibleDate,
  computeEligibility,
  type Donor,
  type WithKeys,
} from "@pulsechain/shared";
import { getItem, putItem } from "../lib/db.js";
import { badRequest, notFound, ok, forbidden, withErrors } from "../lib/http.js";
import { getAuthContext, isScopedTo } from "../lib/auth.js";

function generateDonorId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `D-${ts}-${rand}`;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const pathParams = event.pathParameters || {};
    const auth = getAuthContext(event);

    // -------------------------------------------------------------------------
    // POST /donors/register — Rapid donor registration (<30s on mobile)
    // -------------------------------------------------------------------------
    if (method === "POST" && (path === "/donors/register" || path === "/donors")) {
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = createDonorSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const input = parseResult.data;
      const donorId = generateDonorId();
      const nowIso = new Date().toISOString();
      const nextEligibleAt = computeNextEligibleDate(input.lastDonationAt);

      const donor: Donor = {
        donorId,
        name: input.name,
        bloodGroup: input.bloodGroup,
        lat: input.lat,
        lng: input.lng,
        city: input.city,
        communityId: input.communityId,
        lastDonationAt: input.lastDonationAt,
        nextEligibleAt,
        contactVia: input.contactVia || "COORDINATOR",
        phone: input.phone,
        email: input.email,
        registeredAt: nowIso,
        verifiedDonations: input.lastDonationAt ? 1 : 0,
      };

      const keys = donorKey(donorId);
      const gsi1 = donorGsi1(donor.bloodGroup, donor.nextEligibleAt, donorId);
      const gsi2 = donor.communityId
        ? donorGsi2(donor.communityId, donor.name)
        : {};

      const item: WithKeys<Donor> = {
        ...keys,
        ...gsi1,
        ...gsi2,
        entityType: "DONOR",
        ...donor,
      };

      await putItem(item);

      const eligibility = computeEligibility(donor);
      return ok({
        donor,
        eligibility,
      });
    }

    // -------------------------------------------------------------------------
    // POST /donors/:id/defer — Voluntary self-deferral (NO reason collected/saved)
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/defer")) {
      const donorId = pathParams.id || path.split("/")[2];
      if (!donorId) {
        return badRequest("Missing donor ID");
      }

      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = deferDonorSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const keys = donorKey(donorId);
      const existing = await getItem<Donor & WithKeys<Donor>>(keys.PK, keys.SK);
      if (!existing) {
        return notFound(`Donor ${donorId} not found`);
      }

      const deferredUntil = parseResult.data.deferredUntil;
      const updatedDonor: Donor = {
        ...existing,
        selfDeferredUntil: deferredUntil,
      };

      const gsi1 = donorGsi1(updatedDonor.bloodGroup, updatedDonor.nextEligibleAt, donorId);
      const gsi2 = updatedDonor.communityId
        ? donorGsi2(updatedDonor.communityId, updatedDonor.name)
        : {};

      await putItem({
        ...keys,
        ...gsi1,
        ...gsi2,
        entityType: "DONOR",
        ...updatedDonor,
      });

      const eligibility = computeEligibility(updatedDonor);
      return ok({
        success: true,
        donor: updatedDonor,
        eligibility,
      });
    }

    // -------------------------------------------------------------------------
    // GET /donors/:id — Donor profile & live eligibility
    // -------------------------------------------------------------------------
    if (method === "GET" && (path.startsWith("/donors/") || path === "/donors/me")) {
      const donorId = path === "/donors/me" ? auth.userId || auth.scopeId : pathParams.id || path.split("/")[2];
      if (!donorId) {
        return badRequest("Missing donor ID");
      }

      const keys = donorKey(donorId);
      const donor = await getItem<Donor & WithKeys<Donor>>(keys.PK, keys.SK);
      if (!donor) {
        return notFound(`Donor ${donorId} not found`);
      }

      // Privacy Check:
      // A donor can view themselves. A community coordinator can view members in their own community.
      // Other roles cannot view arbitrary donor profiles.
      if (
        auth.role === "DONOR" &&
        auth.userId &&
        auth.userId !== donorId
      ) {
        return forbidden("Cannot access another donor's profile");
      }

      if (
        auth.role === "COMMUNITY_COORDINATOR" &&
        donor.communityId &&
        !isScopedTo(auth, donor.communityId)
      ) {
        return forbidden("Cannot access donors outside your assigned community");
      }

      const eligibility = computeEligibility(donor);

      return ok({
        donor,
        eligibility,
      });
    }

    return badRequest(`Unsupported method/path: ${method} ${path}`);
  }
);
