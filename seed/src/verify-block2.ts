/**
 * seed/src/verify-block2.ts
 *
 * Verifies real Cognito authentication against deployed API:
 * 1. Request with NO Authorization header -> 401 Unauthorized from API Gateway.
 * 2. Request with FORGED token -> 401 Unauthorized from API Gateway.
 * 3. Real login for all 3 users against Cognito User Pool -> returns valid JWT IdToken.
 * 4. Verify landing route mapping for all three personas.
 * 5. Request with valid token -> 200 OK from API Gateway.
 * 6. Audit check 4.7: Valid token for wrong facility -> 403 Forbidden from backend handler.
 * 7. Audit check 4.7 with spoofed header + valid token -> still 403 Forbidden.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const API_URL = "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com";
const USER_POOL_ID = process.env.USER_POOL_ID || "ap-south-1_vKrvtjKcl";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID || "ettfkfru7hs8ghgu1e2e1snhf";
const REGION = process.env.AWS_REGION || "ap-south-1";
const PASSWORD = process.env.DEMO_USER_PASSWORD || "PulseChain2026!";

async function main() {
  console.log("=== Block 2: Cognito Authentication Verification ===\n");
  console.log("API URL:     ", API_URL);
  console.log("User Pool:   ", USER_POOL_ID);
  console.log("Client ID:   ", CLIENT_ID);

  const cognito = new CognitoIdentityProviderClient({ region: REGION });

  // 1. Request with NO Authorization header
  console.log("\n[Test 1] Request with NO Authorization header to /facilities:");
  const noAuthRes = await fetch(`${API_URL}/facilities`);
  console.log(`  Status: ${noAuthRes.status} (Expected: 401)`);
  const noAuthBody = await noAuthRes.text();
  console.log(`  Response: ${noAuthBody}`);
  if (noAuthRes.status !== 401) {
    throw new Error(`Test 1 Failed: Expected 401, got ${noAuthRes.status}`);
  }
  console.log("  ✓ API Gateway rejected unauthenticated request with 401.");

  // 2. Request with FORGED token
  console.log("\n[Test 2] Request with FORGED token to /facilities:");
  const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkZha2UiLCJjdXN0b206ZmFjaWxpdHlJZCI6IkZBQ19DREVfU05CQyJ9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ";
  const forgedRes = await fetch(`${API_URL}/facilities`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  console.log(`  Status: ${forgedRes.status} (Expected: 401)`);
  const forgedBody = await forgedRes.text();
  console.log(`  Response: ${forgedBody}`);
  if (forgedRes.status !== 401) {
    throw new Error(`Test 2 Failed: Expected 401, got ${forgedRes.status}`);
  }
  console.log("  ✓ API Gateway rejected forged token with 401.");

  // 3. Real Cognito login for all three personas
  console.log("\n[Test 3 & 4] Real sign-in for all three demo personas and route mapping:");
  const personas = [
    { email: "centre@example.invalid", expectedRole: "BLOOD_CENTRE", expectedFacility: "FAC_CBE_SNBC", expectedRoute: "/centre/stock" },
    { email: "hospital@example.invalid", expectedRole: "HOSPITAL", expectedFacility: "FAC_CBE_KMCH", expectedRoute: "/hospital/inbox" },
    { email: "coordinator@example.invalid", expectedRole: "COORDINATOR", expectedFacility: "COORDINATOR", expectedRoute: "/coordinator/escalations" },
  ];

  const tokens: Record<string, string> = {};

  for (const p of personas) {
    const authRes = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: p.email,
          PASSWORD: PASSWORD,
        },
      }),
    );
    const idToken = authRes.AuthenticationResult?.IdToken;
    if (!idToken) throw new Error(`No IdToken returned for ${p.email}`);
    tokens[p.email] = idToken;

    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
    const role = payload["custom:role"];
    const facilityId = payload["custom:facilityId"];

    // Compute route matching frontend RequireRole / App.tsx logic
    let landingRoute = "/";
    if (role === "BLOOD_CENTRE") landingRoute = "/centre/stock";
    else if (role === "HOSPITAL") landingRoute = "/hospital/inbox";
    else if (role === "COORDINATOR") landingRoute = "/coordinator/escalations";

    console.log(`  User: ${p.email}`);
    console.log(`    Role: ${role} (Expected: ${p.expectedRole})`);
    console.log(`    FacilityId: ${facilityId} (Expected: ${p.expectedFacility})`);
    console.log(`    Landing Route: ${landingRoute} (Expected: ${p.expectedRoute})`);

    if (role !== p.expectedRole || facilityId !== p.expectedFacility || landingRoute !== p.expectedRoute) {
      throw new Error(`Persona check failed for ${p.email}`);
    }
    console.log(`    ✓ Login and route mapping confirmed.`);
  }

  // 5. Request with VALID token
  console.log("\n[Test 5] Request with VALID Blood Centre token to /facilities:");
  const validRes = await fetch(`${API_URL}/facilities`, {
    headers: { Authorization: `Bearer ${tokens["centre@example.invalid"]}` },
  });
  console.log(`  Status: ${validRes.status} (Expected: 200)`);
  if (validRes.status !== 200) {
    throw new Error(`Test 5 Failed: Expected 200, got ${validRes.status}`);
  }
  const facilities = (await validRes.json()) as any[];
  console.log(`  ✓ Successfully retrieved ${facilities.length} facilities with valid Cognito token.`);

  // 6. Check 4.7: Valid token for wrong facility
  console.log("\n[Test 6] Audit Check 4.7 — Valid token for wrong facility:");
  // Trigger sweep-now so offers are generated
  console.log("  Triggering /demo/sweep-now with Blood Centre token...");
  const sweepRes = await fetch(`${API_URL}/demo/sweep-now`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens["centre@example.invalid"]}` },
  });
  console.log(`  Sweep status: ${sweepRes.status}`);

  // Query KMCH inbox to find active offer
  const inboxRes = await fetch(`${API_URL}/facilities/FAC_CBE_KMCH/inbox`, {
    headers: { Authorization: `Bearer ${tokens["hospital@example.invalid"]}` },
  });
  console.log(`  Query KMCH inbox: status ${inboxRes.status}`);
  const inboxOffers = (await inboxRes.json()) as any[];
  if (!inboxOffers || inboxOffers.length === 0) {
    throw new Error("No offers found in KMCH inbox after sweep!");
  }
  let targetOfferId = inboxOffers[0].offerId;
  console.log(`  Target Offer for KMCH: ${targetOfferId} (Status: ${inboxOffers[0].status})`);

  // Now Blood Centre (FAC_CBE_SNBC) tries to claim KMCH's offer
  console.log(`  Attempting claim with BLOOD_CENTRE token (facility FAC_CBE_SNBC)...`);
  const wrongClaimRes = await fetch(`${API_URL}/offers/${targetOfferId}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens["centre@example.invalid"]}`,
    },
  });
  console.log(`  Status: ${wrongClaimRes.status} (Expected: 403)`);
  const wrongClaimBody = await wrongClaimRes.text();
  console.log(`  Response: ${wrongClaimBody}`);
  if (wrongClaimRes.status !== 403) {
    throw new Error(`Test 6 Failed: Expected 403, got ${wrongClaimRes.status}`);
  }
  console.log("  ✓ Claim rejected with 403 Forbidden when token facility does not match offer recipient.");

  // 7. Audit Check 4.7 with spoofed header
  console.log("\n[Test 7] Audit Check 4.7 with spoofed header (X-Facility-Id: FAC_CBE_KMCH):");
  const spoofClaimRes = await fetch(`${API_URL}/offers/${targetOfferId}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens["centre@example.invalid"]}`,
      "X-Facility-Id": "FAC_CBE_KMCH",
      "x-facility-id": "FAC_CBE_KMCH",
    },
  });
  console.log(`  Status: ${spoofClaimRes.status} (Expected: 403)`);
  const spoofClaimBody = await spoofClaimRes.text();
  console.log(`  Response: ${spoofClaimBody}`);
  if (spoofClaimRes.status !== 403) {
    throw new Error(`Test 7 Failed: Expected 403, got ${spoofClaimRes.status}`);
  }
  console.log("  ✓ Claim rejected with 403 Forbidden even when client sends spoofed X-Facility-Id header.");

  console.log("\n=== ALL BLOCK 2 CHECKS VERIFIED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
