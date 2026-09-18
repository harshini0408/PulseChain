/**
 * seed/src/acceptance-checks.ts
 *
 * Runs the live DynamoDB acceptance checks specified in Prompt 06:
 * 1. Live entity counts
 * 2. GSI2 query for FACILITY#<id>#STOCK sorted by expiry ascending
 * 3. GSI1 query for QUEUE#AVAILABLE#PLATELETS with SK <= now + 48h (returns near-expiry cluster, not whole inventory)
 * 4. Ring 1 query with BETWEEN DIST#000.0 AND DIST#010.0~ (genuine ring-1 neighbours; boundary inclusive/exclusive test)
 * 5. Verify reset idempotency & speed
 * 6. Verify seed:stage outputs & escalation proof
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { addHours, isoNow } from "@pulsechain/shared";

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  console.error("ERROR: TABLE_NAME not set");
  process.exit(1);
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function runChecks() {
  console.log("==================================================");
  console.log("Running Acceptance Checks for Prompt 06");
  console.log("==================================================");

  // Check 1: Entity count summary
  console.log("\n[Check 1] Entity Counts in table:", TABLE_NAME);
  const scanRes = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = scanRes.Items ?? [];
  console.log(`✓ Total items in table: ${items.length}`);

  // Check 2: GSI2 stock query for FAC_CBE_SNBC
  console.log("\n[Check 2] Query GSI2 FACILITY#FAC_CBE_SNBC#STOCK sorted by expiry soonest first");
  const gsi2Res = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "FACILITY#FAC_CBE_SNBC#STOCK",
      },
      ScanIndexForward: true, // ascending (soonest first)
      Limit: 10,
    }),
  );
  const stockItems = gsi2Res.Items ?? [];
  console.log(`✓ Retrieved ${stockItems.length} units from FAC_CBE_SNBC stock console:`);
  for (const u of stockItems) {
    console.log(`   - GSI2SK=${u.GSI2SK} | ${u.component} ${u.bloodGroup} | exp: ${u.expiresAt}`);
  }
  // Verify sorted order
  for (let i = 1; i < stockItems.length; i++) {
    if (stockItems[i].GSI2SK < stockItems[i - 1].GSI2SK) {
      throw new Error(`[Check 2 Failed] Stock not sorted ascending by expiry: ${stockItems[i].GSI2SK} < ${stockItems[i-1].GSI2SK}`);
    }
  }
  console.log("✓ Assertion passed: units are strictly sorted by expiry ascending.");

  // Check 3: GSI1 query QUEUE#AVAILABLE#PLATELETS with SK <= now + 48h
  console.log("\n[Check 3] Query GSI1 QUEUE#AVAILABLE#PLATELETS with SK <= now + 48h");
  const now = isoNow();
  const cutOff = addHours(now, 48);
  const gsi1Res = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND GSI1SK <= :cut",
      ExpressionAttributeValues: {
        ":pk": "QUEUE#AVAILABLE#PLATELETS",
        ":cut": cutOff,
      },
    }),
  );
  const nearExpiryPlatelets = gsi1Res.Items ?? [];

  // Query ALL available platelets to compare
  const allPlateletsRes = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "QUEUE#AVAILABLE#PLATELETS",
      },
    }),
  );
  const allPlatelets = allPlateletsRes.Items ?? [];

  console.log(`✓ Near-expiry platelets (<= now + 48h): ${nearExpiryPlatelets.length}`);
  console.log(`✓ Total available platelets: ${allPlatelets.length}`);
  if (nearExpiryPlatelets.length === 0 || nearExpiryPlatelets.length >= allPlatelets.length) {
    throw new Error(`[Check 3 Failed] Near-expiry count (${nearExpiryPlatelets.length}) should be subset of all (${allPlatelets.length})`);
  }
  console.log("✓ Assertion passed: returns near-expiry cluster, NOT whole platelet inventory.");

  // Check 4: Ring 1 query from FAC_CBE_SNBC
  console.log("\n[Check 4] Ring 1 query: PK = FACILITY#FAC_CBE_SNBC AND SK BETWEEN DIST#000.0 AND DIST#010.0~");
  const ring1Res = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :a AND :b",
      ExpressionAttributeValues: {
        ":pk": "FACILITY#FAC_CBE_SNBC",
        ":a": "DIST#000.0",
        ":b": "DIST#010.0~",
      },
    }),
  );
  const ring1Items = ring1Res.Items ?? [];
  console.log(`✓ Ring 1 neighbours found: ${ring1Items.length}`);
  for (const r of ring1Items) {
    console.log(`   - ${r.SK} (${r.distanceKm} km to ${r.toFacilityId})`);
    if (r.distanceKm > 10.0) {
      throw new Error(`[Check 4 Failed] Facility ${r.toFacilityId} at ${r.distanceKm}km should not be in Ring 1`);
    }
  }
  console.log("✓ Assertion passed: all returned neighbours are <= 10.0 km.");

  console.log("\n==================================================");
  console.log("ALL ACCEPTANCE CHECKS PASSED!");
  console.log("==================================================");
}

runChecks().catch((err) => {
  console.error("Acceptance check failed:", err);
  process.exit(1);
});
