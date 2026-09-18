import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { stageDemo } from "./stage-demo.js";

const API_URL = "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com";
const REGION = "ap-south-1";
const CLIENT_ID = "ettfkfru7hs8ghgu1e2e1snhf";
const PASSWORD = "PulseChain2026!";
const TABLE_NAME = "PulseChain";

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function getToken(username: string): Promise<string> {
  const res = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: PASSWORD,
      },
    }),
  );
  return res.AuthenticationResult?.IdToken!;
}

async function run() {
  console.log("=== BLOCK 2: PROVE AUDIT ROWS FOR CLAIM TRANSACTION ===\n");

  const centreToken = await getToken("centre@example.invalid");
  const hospitalToken = await getToken("hospital@example.invalid");

  // 1. Reset and stage
  console.log("Resetting and staging demo data...");
  await fetch(`${API_URL}/demo/reset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${centreToken}` },
  });
  await stageDemo();

  // Trigger sweep to create escalation and offers
  console.log("Triggering rescue sweep (POST /demo/sweep-now)...");
  const sweepRes = await fetch(`${API_URL}/demo/sweep-now`, {
    method: "POST",
    headers: { Authorization: `Bearer ${centreToken}` },
  });
  console.log(`Sweep status: ${sweepRes.status}`);
  console.log("Waiting 4s for Step Functions / match-ring execution...");
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // 2. Fetch KMCH inbox to get the claim offer
  console.log("Fetching KMCH inbox...");
  const inboxRes = await fetch(`${API_URL}/facilities/FAC_CBE_KMCH/inbox`, {
    headers: { Authorization: `Bearer ${hospitalToken}` },
  });
  const offers: any[] = await inboxRes.json();
  const targetOffer = offers.find((o) => o.unitId === "DEMO_UNIT_CLAIM_001" && o.status === "OPEN");

  if (!targetOffer) {
    console.error("Target offer for DEMO_UNIT_CLAIM_001 not found in inbox!");
    console.log("Inbox offers:", offers.map(o => ({ id: o.offerId, unitId: o.unitId, status: o.status })));
    return;
  }

  console.log(`Target offer: ${targetOffer.offerId} (SK: ${targetOffer.SK})`);

  // 3. Claim the offer
  console.log("Claiming offer as KMCH...");
  const claimRes = await fetch(`${API_URL}/offers/${targetOffer.offerId}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hospitalToken}`,
    },
  });
  const claimJson = await claimRes.json();
  console.log("Claim response:", JSON.stringify(claimJson, null, 2));

  // 4. Query all audit rows for this unit
  console.log("\nQuerying audit rows for DEMO_UNIT_CLAIM_001 (PK = UNIT#DEMO_UNIT_CLAIM_001, SK begins_with AUDIT#)...");
  const auditRes = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": "UNIT#DEMO_UNIT_CLAIM_001",
        ":prefix": "AUDIT#",
      },
    }),
  );

  const rows = (auditRes.Items || []) as any[];
  // Sort in timestamp order
  rows.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  console.log(`\nFound ${rows.length} audit records for UNIT#DEMO_UNIT_CLAIM_001:`);
  rows.forEach((r, idx) => {
    console.log(`\n[Audit Row #${idx + 1}]`);
    console.log(`  Timestamp : ${r.timestamp}`);
    console.log(`  EventType : ${r.eventType}`);
    console.log(`  EventId   : ${r.eventId}`);
    console.log(`  Actor     : ${r.actorFacilityId || "SYSTEM"}`);
    console.log(`  Details   : ${JSON.stringify(r.details)}`);
  });

  const supersededCount = rows.filter((r) => r.eventType === "OFFER_SUPERSEDED").length;
  const claimedCount = rows.filter((r) => r.eventType === "OFFER_CLAIMED").length;
  console.log(`\nSummary: ${claimedCount} OFFER_CLAIMED, ${supersededCount} OFFER_SUPERSEDED audit rows.`);
}

run().catch((e) => console.error("Error:", e));
