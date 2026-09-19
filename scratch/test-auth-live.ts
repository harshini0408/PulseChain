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
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/pools",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/requisitions?hospitalId=FAC_CBE_KMCH",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/requisitions?status=OPEN",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/dashboard",
    "https://pvn1ufnvn6.execute-api.ap-south-1.amazonaws.com/escalations/active",
  ];

  for (const u of testUrls) {
    const r = await fetch(u, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (u.includes("/dashboard")) {
      const data = await r.json();
      console.log(`[${r.status}] ${u} FULL JSON:`, JSON.stringify(data, null, 2));
    } else {
      const text = await r.text();
      console.log(`[${r.status}] ${u} -> ${text.slice(0, 100)}`);
    }
  }
}

main().catch(console.error);
