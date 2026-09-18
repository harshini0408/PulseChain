/**
 * frontend/src/auth/amplify.ts
 *
 * Configures AWS Amplify Auth module using environment variables.
 * Only Auth module is configured; no Amplify data layer.
 */

import { Amplify } from "aws-amplify";

const userPoolId = import.meta.env.VITE_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;

export function configureAmplify(): boolean {
  if (userPoolId && userPoolClientId) {
    try {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
          },
        },
      });
      return true;
    } catch (err) {
      console.warn("Amplify configuration failed:", err);
      return false;
    }
  }
  return false;
}

configureAmplify();
