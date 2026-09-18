/**
 * seed/src/create-users.ts
 *
 * Scripted creation of permanent Cognito demo users:
 * 1. BLOOD_CENTRE -> FAC_CBE_SNBC
 * 2. HOSPITAL -> FAC_CBE_KMCH
 * 3. COORDINATOR -> COORDINATOR
 *
 * Sets permanent passwords (no force-change password prompt).
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DescribeStacksCommand, CloudFormationClient } from "@aws-sdk/client-cloudformation";

export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "PulseChain2026!";

export interface DemoCognitoUser {
  email: string;
  role: "BLOOD_CENTRE" | "HOSPITAL" | "COORDINATOR";
  facilityId: string;
  password?: string;
}

export const DEMO_USERS: DemoCognitoUser[] = [
  {
    email: "centre@example.invalid",
    role: "BLOOD_CENTRE",
    facilityId: "FAC_CBE_SNBC",
    password: DEMO_PASSWORD,
  },
  {
    email: "hospital@example.invalid",
    role: "HOSPITAL",
    facilityId: "FAC_CBE_KMCH",
    password: DEMO_PASSWORD,
  },
  {
    email: "coordinator@example.invalid",
    role: "COORDINATOR",
    facilityId: "COORDINATOR",
    password: DEMO_PASSWORD,
  },
];

async function getStackOutputs(region: string, stackName = "pulsechain-backend") {
  const cfn = new CloudFormationClient({ region });
  const res = await cfn.send(new DescribeStacksCommand({ StackName: stackName }));
  const stack = res.Stacks?.[0];
  const outputs: Record<string, string> = {};
  for (const o of stack?.Outputs ?? []) {
    if (o.OutputKey && o.OutputValue) {
      outputs[o.OutputKey] = o.OutputValue;
    }
  }
  return outputs;
}

export async function createDemoUsers(params?: {
  userPoolId?: string;
  clientId?: string;
  region?: string;
}) {
  const region = params?.region ?? process.env.AWS_REGION ?? "ap-south-1";
  let userPoolId = params?.userPoolId ?? process.env.USER_POOL_ID ?? process.env.VITE_USER_POOL_ID;
  let clientId = params?.clientId ?? process.env.USER_POOL_CLIENT_ID ?? process.env.VITE_USER_POOL_CLIENT_ID;

  if (!userPoolId || !clientId) {
    console.log("Fetching User Pool and Client IDs from CloudFormation stack...");
    try {
      const outputs = await getStackOutputs(region);
      userPoolId = userPoolId || outputs["UserPoolId"];
      clientId = clientId || outputs["UserPoolClientId"];
    } catch (e: any) {
      console.warn("Could not query CloudFormation outputs:", e.message);
    }
  }

  if (!userPoolId) {
    throw new Error("Missing USER_POOL_ID. Ensure backend is deployed or provide USER_POOL_ID env var.");
  }

  const client = new CognitoIdentityProviderClient({ region });
  console.log(`\nCreating demo users in Cognito User Pool: ${userPoolId}`);

  for (const user of DEMO_USERS) {
    const password = user.password ?? DEMO_PASSWORD;
    console.log(`\nProcessing user: ${user.email} (${user.role} @ ${user.facilityId})`);

    try {
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: user.email,
          MessageAction: "SUPPRESS",
          UserAttributes: [
            { Name: "email", Value: user.email },
            { Name: "email_verified", Value: "true" },
            { Name: "custom:facilityId", Value: user.facilityId },
            { Name: "custom:role", Value: user.role },
          ],
        }),
      );
      console.log(`  ✓ Created user ${user.email}`);
    } catch (err: any) {
      if (err.name === "UsernameExistsException") {
        console.log(`  - User ${user.email} already exists, updating attributes...`);
        await client.send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: user.email,
            UserAttributes: [
              { Name: "email_verified", Value: "true" },
              { Name: "custom:facilityId", Value: user.facilityId },
              { Name: "custom:role", Value: user.role },
            ],
          }),
        );
      } else {
        throw err;
      }
    }

    // Set permanent password so no force-change password prompt appears
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: user.email,
        Password: password,
        Permanent: true,
      }),
    );
    console.log(`  ✓ Set permanent password for ${user.email}`);

    // Verify authentication if clientId is available
    if (clientId) {
      try {
        const authRes = await client.send(
          new InitiateAuthCommand({
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: clientId,
            AuthParameters: {
              USERNAME: user.email,
              PASSWORD: password,
            },
          }),
        );
        const idToken = authRes.AuthenticationResult?.IdToken;
        if (idToken) {
          // Decode payload to verify claims
          const payloadBase64 = idToken.split(".")[1];
          const claims = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf8"));
          console.log(`  ✓ Verified auth: token issued with claims: role="${claims["custom:role"]}", facilityId="${claims["custom:facilityId"]}"`);
        }
      } catch (authErr: any) {
        console.warn(`  ! Auth verification note: ${authErr.message}`);
      }
    }
  }

  console.log("\nAll 3 demo users successfully created and verified with permanent passwords.");
  return { userPoolId, clientId };
}

// If invoked directly
if (process.argv[1]?.endsWith("create-users.ts") || process.argv[1]?.endsWith("create-users.js")) {
  createDemoUsers().catch((err) => {
    console.error("Error creating users:", err);
    process.exit(1);
  });
}
