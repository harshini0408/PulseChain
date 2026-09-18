import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  console.log("=== LIVE API GATEWAY AUTH AUDIT ===\n");

  const validHospitalToken = await getToken("hospital@example.invalid");
  const validCentreToken = await getToken("centre@example.invalid");

  // A5: No Token
  console.log("--- A5: No Token ---");
  const noTokenRes = await fetch(`${API_URL}/facilities/FAC_CBE_SNBC/stock`);
  console.log("No token HTTP Status:", noTokenRes.status);
  console.log("No token body:", await noTokenRes.text());

  // A3: Forged Token (Invalid Signature)
  console.log("\n--- A3: Forged Token (Corrupted Signature) ---");
  const parts = validHospitalToken.split(".");
  const forgedToken = `${parts[0]}.${parts[1]}.INVALIDSIGNATURECORRUPTED1234567890`;
  const forgedRes = await fetch(`${API_URL}/facilities/FAC_CBE_SNBC/stock`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  console.log("Forged token HTTP Status:", forgedRes.status);
  console.log("Forged token response:", await forgedRes.text());

  // A4: Cross-facility Authorization Check
  console.log("\n--- A4: Cross-facility Check ---");
  // Hospital token (FAC_CBE_KMCH) attempting to claim an offer intended for FAC_CBE_GH
  const claimRes = await fetch(`${API_URL}/offers/OFFER_U696AE2BE37394931_R1_FAC_CBE_GH/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${validHospitalToken}` },
  });
  console.log("Cross-facility claim HTTP Status:", claimRes.status);
  console.log("Cross-facility claim body:", await claimRes.text());
}

run().catch((e) => console.error("Error:", e));
