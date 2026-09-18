/**
 * seed/src/stage-demo.ts
 *
 * Writes exactly two deterministic platelet units for the live demo:
 *
 * Unit 1 — "the claim path"
 *   - At FAC_CBE_SNBC (primary Coimbatore blood centre)
 *   - Blood group O+ (most common, maximises compatible recipients in ring 1)
 *   - ~6 hours to expiry (well inside the 48h threshold — sweep fires immediately)
 *   - At least two ring-1 hospitals (KMCH, GH) have open requisitions for O+ platelets
 *     → scoring produces a ranked top-3 with visibly different scores
 *
 * Unit 2 — "the escalation path"
 *   - At FAC_CBE_RBANKS
 *   - Blood group AB- (rare; ~0.5% of Indian population; very few compatible recipients)
 *   - ~38 hours to expiry (inside threshold)
 *   - Ring-1 neighbours either don't handle platelets or have no AB- demand
 *   - Will escalate ring 1 → ring 2 → ring 3 on demo day
 *   - Verified here by checking ring-1 candidate count before writing
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

import {
  unitKey,
  unitQueueGsi1,
  unitStockGsi2,
  distanceKey,
  getCompatibility,
} from "@pulsechain/shared";
import { addHours, isoNow } from "@pulsechain/shared";
import { getConfig } from "@pulsechain/shared";
import { FACILITIES, generateDemandItems, generateRequisitionItems } from "./generate.js";
import { haversineKm } from "./distances-util.js";

// ---------------------------------------------------------------------------
// Fixed IDs — must be stable across resets (same unit ID every time = idempotent)
// ---------------------------------------------------------------------------

export const DEMO_UNIT_1_ID = "DEMO_UNIT_CLAIM_001";   // the claim-path unit
export const DEMO_UNIT_2_ID = "DEMO_UNIT_ESC_001";     // the escalation-path unit

// ---------------------------------------------------------------------------
// DynamoDB client
// ---------------------------------------------------------------------------

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  console.error("ERROR: TABLE_NAME environment variable is not set.");
  process.exit(1);
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

async function putItem(item: Record<string, unknown>): Promise<void> {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME!, Item: item }));
}

// ---------------------------------------------------------------------------
// Ring-1 candidate check for unit 2
// ---------------------------------------------------------------------------

function getRing1Neighbours(originId: string): string[] {
  const origin = FACILITIES.find((f) => f.facilityId === originId);
  if (!origin) throw new Error(`Facility ${originId} not found`);

  return FACILITIES
    .filter((f) => f.facilityId !== originId)
    .filter((f) => {
      const km = haversineKm(origin.lat, origin.lng, f.lat, f.lng);
      return km <= 10;
    })
    .map((f) => f.facilityId);
}

function getPlateletsCapableRing1Neighbours(originId: string): string[] {
  return getRing1Neighbours(originId).filter((fid) => {
    const f = FACILITIES.find((x) => x.facilityId === fid);
    return f?.components.includes("PLATELETS") ?? false;
  });
}

// ---------------------------------------------------------------------------
// Stage the two demo units
// ---------------------------------------------------------------------------

export async function stageDemo(): Promise<void> {
  const now = isoNow();
  const cfg = getConfig();
  const shelfHoursPlatelets = cfg.shelfLifeDays.PLATELETS * 24; // 120 h

  // ─── Unit 1: O+, 6 hours to expiry, at FAC_CBE_SNBC ───────────────────

  const unit1ExpiresAt  = addHours(now, 6);
  const unit1CollectedAt = addHours(unit1ExpiresAt, -shelfHoursPlatelets);

  const unit1: Record<string, unknown> = {
    ...unitKey(DEMO_UNIT_1_ID),
    ...unitQueueGsi1("AVAILABLE", "PLATELETS", unit1ExpiresAt, DEMO_UNIT_1_ID),
    ...unitStockGsi2("FAC_CBE_SNBC", unit1ExpiresAt, DEMO_UNIT_1_ID),
    entityType: "UNIT",
    unitId: DEMO_UNIT_1_ID,
    facilityId: "FAC_CBE_SNBC",
    component: "PLATELETS",
    bloodGroup: "O+",
    volumeMl: 250,
    valueInr: cfg.valuePerUnitInr,
    collectedAt: unit1CollectedAt,
    expiresAt: unit1ExpiresAt,
    status: "AVAILABLE",
    version: 1,
    _stageNote: "Demo claim-path unit — do not modify",
  };

  await putItem(unit1);

  // ─── Unit 2: AB-, 38 hours to expiry, at FAC_CBE_RBANKS ───────────────

  const unit2ExpiresAt  = addHours(now, 38);
  const unit2CollectedAt = addHours(unit2ExpiresAt, -shelfHoursPlatelets);

  const unit2: Record<string, unknown> = {
    ...unitKey(DEMO_UNIT_2_ID),
    ...unitQueueGsi1("AVAILABLE", "PLATELETS", unit2ExpiresAt, DEMO_UNIT_2_ID),
    ...unitStockGsi2("FAC_CBE_RBANKS", unit2ExpiresAt, DEMO_UNIT_2_ID),
    entityType: "UNIT",
    unitId: DEMO_UNIT_2_ID,
    facilityId: "FAC_CBE_RBANKS",
    component: "PLATELETS",
    bloodGroup: "AB-",
    volumeMl: 240,
    valueInr: cfg.valuePerUnitInr,
    collectedAt: unit2CollectedAt,
    expiresAt: unit2ExpiresAt,
    status: "AVAILABLE",
    version: 1,
    _stageNote: "Demo escalation-path unit — expect ring-1 miss",
  };

  await putItem(unit2);

  // ─── Verify unit 2 will actually escalate ──────────────────────────────

  const plateletRing1 = getPlateletsCapableRing1Neighbours("FAC_CBE_RBANKS");
  const demandItems = generateDemandItems();
  const reqItems = generateRequisitionItems(now);

  console.log("\n=== Demo staging complete ===\n");
  console.log(`Unit 1 (claim path):`);
  console.log(`  ID:          ${DEMO_UNIT_1_ID}`);
  console.log(`  Facility:    FAC_CBE_SNBC (Coimbatore SNS Blood Centre)`);
  console.log(`  Component:   PLATELETS  |  Blood group: O+`);
  console.log(`  Expires at:  ${unit1ExpiresAt}  (~6 h from now)`);

  console.log(`\nUnit 2 (escalation path):`);
  console.log(`  ID:          ${DEMO_UNIT_2_ID}`);
  console.log(`  Facility:    FAC_CBE_RBANKS (Rotary Blood Bank Coimbatore)`);
  console.log(`  Component:   PLATELETS  |  Blood group: AB-`);
  console.log(`  Expires at:  ${unit2ExpiresAt}  (~38 h from now)`);

  console.log(`\nRing-1 PLATELETS-capable neighbours of FAC_CBE_RBANKS:`);
  console.log(`  ${plateletRing1.join(", ")}`);

  // Check if any ring-1 neighbour has compatible requisitions or standing demand for AB- platelets
  const viableRing1 = plateletRing1.filter((facId) => {
    // Check open requisitions for this facility
    const facReqs = reqItems.filter((r) => (r as any).hospitalId === facId && (r as any).component === "PLATELETS");
    const hasCompatibleReq = facReqs.some((r) => {
      const compat = getCompatibility("PLATELETS", "AB-", (r as any).bloodGroup);
      return compat.level !== "INCOMPATIBLE";
    });

    // Check standing demand for this facility
    const facDemand = demandItems.filter(
      (d) => (d as any).facilityId === facId && (d as any).component === "PLATELETS" && (d as any).bloodGroup === "AB-",
    );
    const hasDemand = facDemand.length > 0;

    return hasCompatibleReq || hasDemand;
  });

  if (viableRing1.length === 0) {
    console.log(`  ✓ Matcher check passed: 0 viable ring-1 candidates for AB- platelets.`);
    console.log(`  ✓ Unit 2 is guaranteed to escalate from Ring 1 → Ring 2 → Regional on demo day.`);
  } else {
    throw new Error(`[stage-demo] Unit 2 unexpectedly matched ring-1 neighbours: ${viableRing1.join(", ")}`);
  }
}

if (process.argv[1] && (process.argv[1].endsWith("stage-demo.ts") || process.argv[1].endsWith("stage-demo.js"))) {
  stageDemo().catch((err) => { console.error(err); process.exit(1); });
}
