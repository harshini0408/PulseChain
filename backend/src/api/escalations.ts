/**
 * backend/src/api/escalations.ts
 *
 * GET /escalations/active — coordinator corridor map feed
 *
 * Returns all escalations whose GSI1PK = "ESC#ACTIVE", enriched with:
 *   - origin facility name (looked up from FACILITIES GSI1)
 *   - active ring number
 *   - component and bloodGroup from the unit record (when subjectType=UNIT)
 *   - startedAt timestamp
 *
 * The coordinator map uses this response to position blobs on the SVG.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ok, withErrors } from "../lib/http.js";
import { queryAll, getItem } from "../lib/db.js";
import type { Escalation } from "@pulsechain/shared";

interface ActiveEscalationRow extends Escalation {
  originFacilityId?: string;
  originFacilityName?: string;
  component?: string;
  bloodGroup?: string;
}

export const handler = withErrors(
  async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Query all active escalations via GSI1
    const rows = await queryAll<Record<string, any>>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk",
      values: { ":pk": "ESC#ACTIVE" },
      scanForward: false, // most recent first
    });

    // Strip DynamoDB key fields, collect unit IDs for enrichment
    const escalations: ActiveEscalationRow[] = rows.map((row) => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...rest } = row;
      return rest as ActiveEscalationRow;
    });

    // Enrich with unit component + bloodGroup for UNIT escalations
    await Promise.all(
      escalations.map(async (esc) => {
        if (esc.subjectType === "UNIT" && esc.subjectId) {
          const unit = await getItem<Record<string, any>>(
            `UNIT#${esc.subjectId}`,
            "META"
          );
          if (unit) {
            esc.component = unit.component;
            esc.bloodGroup = unit.bloodGroup;
            esc.originFacilityId = unit.facilityId;
          }
        }
      })
    );

    return ok({ escalations });
  }
);
