import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "ap-south-1" });

async function verifyAllFeaturesLive() {
  const clientId = "ettfkfru7hs8ghgu1e2e1snhf";
  const res = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: "hospital@example.invalid",
        PASSWORD: "PulseChain2026!",
      },
    }),
  );

  const token = res.AuthenticationResult?.IdToken;
  console.log("1. Cognito Authentication: OK");

  const baseUrl = "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com";

  // Test 1: POST /requisitions
  const createReqRes = await fetch(`${baseUrl}/requisitions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      hospitalId: "FAC_CBE_KMCH",
      component: "PLATELETS",
      bloodGroup: "O+",
      unitsRequested: 2,
      urgency: "HIGH",
      neededBy: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      source: "MANUAL",
    }),
  });
  const createdReq = await createReqRes.json();
  console.log("2. POST /requisitions (Block 1):", createReqRes.status, createdReq.reqId || createdReq);

  // Test 2: GET /pools
  const poolsRes = await fetch(`${baseUrl}/pools`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pools = await poolsRes.json();
  console.log("3. GET /pools (Block 2):", poolsRes.status, `Loaded ${pools.length} pools`);

  // Test 3: Public Mobilisation token test (Block 3)
  const dummyMobRes = await fetch(`${baseUrl}/mobilise/non-existent-token`);
  console.log("4. GET /mobilise/:token Public Endpoint (Block 3):", dummyMobRes.status, "(expected 404 for invalid token)");

  // Test 4: Dashboard stats rollup (Block 5)
  const dashRes = await fetch(`${baseUrl}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dash = await dashRes.json();
  console.log("5. GET /dashboard (Block 5):", dashRes.status, "Totals units saved:", dash.totals?.unitsSaved);
}

verifyAllFeaturesLive().catch(console.error);
