import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomBytes } from "node:crypto";
import {
  createCommunitySchema,
  respondAlertSchema,
  confirmDonationSchema,
  communityKey,
  communityGsi1,
  communityAlertKey,
  communityAlertGsi1,
  communityMembersPartition,
  donorKey,
  donorGsi1,
  donorGsi2,
  computeNextEligibleDate,
  computeEligibility,
  type Community,
  type CommunityAlert,
  type Donor,
  type WithKeys,
  type BloodGroup,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../lib/db.js";
import { badRequest, notFound, ok, forbidden, withErrors } from "../lib/http.js";
import { getAuthContext, isScopedTo } from "../lib/auth.js";
import { writeAuditEvent } from "../lib/audit.js";

function generateCommunityId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `COMM-${ts}-${rand}`;
}

function generateJoinCode(name: string): string {
  const prefix = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "PLX";
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const pathParams = event.pathParameters || {};
    const auth = getAuthContext(event);

    // -------------------------------------------------------------------------
    // POST /communities/register — Register new community
    // -------------------------------------------------------------------------
    if (method === "POST" && (path === "/communities/register" || path === "/communities")) {
      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = createCommunitySchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const input = parseResult.data;
      const communityId = generateCommunityId();
      const joinCode = generateJoinCode(input.name);

      const community: Community = {
        communityId,
        name: input.name,
        type: input.type,
        lat: input.lat,
        lng: input.lng,
        city: input.city,
        memberCount: 0,
        groupCounts: {},
        coordinatorName: input.coordinatorName,
        coordinatorContact: input.coordinatorContact,
        joinCode,
        verified: false,
      };

      const keys = communityKey(communityId);
      const gsi1 = communityGsi1(community.type, communityId);

      const item: WithKeys<Community> = {
        ...keys,
        ...gsi1,
        entityType: "COMMUNITY",
        ...community,
      };

      await putItem(item);

      return ok({
        community,
      });
    }

    // -------------------------------------------------------------------------
    // POST /communities/:id/alerts/:alertId/respond — Coordinator acknowledgment
    // -------------------------------------------------------------------------
    if (method === "POST" && path.includes("/alerts/") && path.endsWith("/respond")) {
      const segments = path.split("/").filter(Boolean);
      const communityId = pathParams.communityId || segments[1];
      const alertId = pathParams.alertId || segments[3];

      if (!communityId || !alertId) {
        return badRequest("Missing communityId or alertId");
      }

      if (auth.role === "COMMUNITY_COORDINATOR" && !isScopedTo(auth, communityId)) {
        return forbidden("Cannot respond for a community outside your scope");
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

      const parseResult = respondAlertSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const { mobilisedCount, status } = parseResult.data;
      const alertKeys = communityAlertKey(communityId, alertId);
      const existingAlert = await getItem<CommunityAlert & WithKeys<CommunityAlert>>(
        alertKeys.PK,
        alertKeys.SK
      );

      if (!existingAlert) {
        return notFound(`Alert ${alertId} not found for community ${communityId}`);
      }

      const nowIso = new Date().toISOString();
      const updatedAlert: CommunityAlert = {
        ...existingAlert,
        status,
        mobilisedCount,
        respondedAt: nowIso,
      };

      const agsi1 = communityAlertGsi1(status, existingAlert.createdAt);
      await putItem({
        ...alertKeys,
        ...agsi1,
        GSI2PK: `REQ#${existingAlert.reqId}#ALERTS`,
        GSI2SK: String(existingAlert.rank).padStart(3, "0"),
        entityType: "CommunityAlert",
        ...updatedAlert,
      });

      // Audit trail
      await writeAuditEvent({
        eventType: "COMMUNITY_RESPONDED",
        subjectType: "REQUISITION",
        subjectId: existingAlert.reqId,
        actorFacilityId: communityId,
        details: {
          communityId,
          alertId,
          mobilisedCount,
          status,
          respondedAt: nowIso,
        },
      });

      return ok({
        success: true,
        alert: updatedAlert,
      });
    }

    // -------------------------------------------------------------------------
    // POST /communities/:id/donations — Facility-confirmed donation recording
    // -------------------------------------------------------------------------
    if (method === "POST" && path.endsWith("/donations")) {
      const segments = path.split("/").filter(Boolean);
      const communityId = pathParams.id || segments[1];

      if (!event.body) {
        return badRequest("Missing request body");
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        return badRequest("Invalid JSON body");
      }

      const parseResult = confirmDonationSchema.safeParse(parsedBody);
      if (!parseResult.success) {
        return badRequest(`Validation failed: ${parseResult.error.message}`);
      }

      const { donorId, facilityId, donationDate } = parseResult.data;
      const donationIso = donationDate || new Date().toISOString();

      const donorKeys = donorKey(donorId);
      const donor = await getItem<Donor & WithKeys<Donor>>(donorKeys.PK, donorKeys.SK);
      if (!donor) {
        return notFound(`Donor ${donorId} not found`);
      }

      const nextEligibleAt = computeNextEligibleDate(donationIso);
      const updatedDonor: Donor = {
        ...donor,
        lastDonationAt: donationIso,
        nextEligibleAt,
        verifiedDonations: (donor.verifiedDonations || 0) + 1,
      };

      const dgsi1 = donorGsi1(updatedDonor.bloodGroup, nextEligibleAt, donorId);
      const dgsi2 = updatedDonor.communityId
        ? donorGsi2(updatedDonor.communityId, updatedDonor.name)
        : {};

      await putItem({
        ...donorKeys,
        ...dgsi1,
        ...dgsi2,
        entityType: "DONOR",
        ...updatedDonor,
      });

      // Audit trail
      await writeAuditEvent({
        eventType: "DONATION_RECORDED",
        subjectType: "REQUISITION",
        subjectId: donorId,
        actorFacilityId: facilityId,
        details: {
          donorId,
          communityId,
          facilityId,
          donationIso,
          verifiedDonations: updatedDonor.verifiedDonations,
        },
      });

      return ok({
        success: true,
        donor: updatedDonor,
        eligibility: computeEligibility(updatedDonor),
      });
    }

    // -------------------------------------------------------------------------
    // GET /communities/:id — Coordinator console & member roster
    // -------------------------------------------------------------------------
    if (method === "GET" && path.startsWith("/communities/")) {
      const communityId = pathParams.id || path.split("/")[2];
      if (!communityId) {
        return badRequest("Missing community ID");
      }

      // Strict isolation: COMMUNITY_COORDINATOR can only access their own community
      if (auth.role === "COMMUNITY_COORDINATOR" && !isScopedTo(auth, communityId)) {
        return forbidden("Access denied: You are not authorized to view this community roster");
      }

      const keys = communityKey(communityId);
      const community = await getItem<Community & WithKeys<Community>>(keys.PK, keys.SK);
      if (!community) {
        return notFound(`Community ${communityId} not found`);
      }

      // Query members via GSI2: GSI2PK = COMMUNITY#<id>#MEMBERS
      const membersRaw = await queryAll<Donor & WithKeys<Donor>>({
        indexName: "GSI2",
        keyCondition: "GSI2PK = :pk",
        values: {
          ":pk": communityMembersPartition(communityId),
        },
      });

      const now = new Date();
      const groupCounts: Partial<Record<BloodGroup, number>> = {};
      let eligibleNowCount = 0;

      const membersRoster = membersRaw.map((m) => {
        const eligibility = computeEligibility(m, now);
        if (eligibility.isEligible) {
          eligibleNowCount++;
        }
        groupCounts[m.bloodGroup] = (groupCounts[m.bloodGroup] || 0) + 1;

        // Privacy rule:
        // When viewed by requesting hospital or non-coordinator, do not expose phone/email
        const isSelfOrCoordinator =
          auth.role === "COMMUNITY_COORDINATOR" || auth.role === "COORDINATOR";

        return {
          donorId: m.donorId,
          name: m.name,
          bloodGroup: m.bloodGroup,
          city: m.city,
          contactVia: m.contactVia,
          phone: isSelfOrCoordinator && m.contactVia === "DIRECT" ? m.phone : undefined,
          email: isSelfOrCoordinator && m.contactVia === "DIRECT" ? m.email : undefined,
          lastDonationAt: m.lastDonationAt,
          nextEligibleAt: m.nextEligibleAt,
          verifiedDonations: m.verifiedDonations || 0,
          eligibility,
        };
      });

      // Query alerts for this community
      const alerts = await queryAll<CommunityAlert & WithKeys<CommunityAlert>>({
        keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
        values: {
          ":pk": `COMMUNITY#${communityId}`,
          ":skPrefix": "ALERT#",
        },
      });

      // Sort alerts descending by createdAt
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return ok({
        community: {
          ...community,
          memberCount: membersRoster.length,
          groupCounts,
        },
        members: membersRoster,
        alerts,
        stats: {
          totalMembers: membersRoster.length,
          eligibleNowCount,
          activeAlerts: alerts.filter((a) => a.status === "OPEN").length,
          totalMobilised: alerts.reduce((sum, a) => sum + (a.mobilisedCount || 0), 0),
        },
      });
    }

    return badRequest(`Unsupported method/path: ${method} ${path}`);
  }
);
