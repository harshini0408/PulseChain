import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "ap-south-1" });

async function main() {
  const clientId = "ettfkfru7hs8ghgu1e2e1snhf";
  // Demo password
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

  const idToken = res.AuthenticationResult?.IdToken;
  console.log("Got ID token:", !!idToken);

  const testUrls = [
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/health",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/facilities",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/facilities/FAC_CBE_KMCH/inbox",
  ];

  for (const u of testUrls) {
    const r = await fetch(u, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    const text = await r.text();
    console.log(`[${r.status}] ${u} -> ${text.slice(0, 100)}`);
  }
}

main().catch(console.error);
