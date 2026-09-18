/**
 * frontend/src/auth/AuthProvider.tsx
 *
 * Identity for the application: user, role, facility and token.
 *
 * Two things here are deliberate and should not be "tidied" away:
 *
 *  1. State starts at `null`, not at a persona. An empty sessionStorage means
 *     nobody is signed in, so RequireAuth redirects and /login is reachable.
 *     Seeding this with a default persona is what previously made
 *     `isAuthenticated` permanently true.
 *
 *  2. Storage is sessionStorage, never localStorage, and it is scoped per
 *     browser window. Two windows therefore hold two different roles at the
 *     same time, which is how the double-claim race in the demo is filmed.
 *
 * This provider is the only *writer* of the session key. api/client.ts reads
 * the same key directly because it has to work outside React, but it never
 * writes — one writer, one shape, no drift.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchAuthSession, signIn, signOut } from "aws-amplify/auth";

export type Role = "BLOOD_CENTRE" | "HOSPITAL" | "COORDINATOR";

/** How the current session was established. Surfaced in the top bar so nobody
 *  is misled about whether the auth in front of them is real. */
export type AuthMode = "cognito" | "demo";

export interface AuthUser {
  email: string;
  role: Role;
  facilityId: string;
  facilityName: string;
  authMode: AuthMode;
  token?: string;
}

export const SESSION_KEY = "pulsechain_session_user";

const DEMO_PASSWORD = "PulseChain2026!";

export const DEMO_PERSONAS: Record<Role, Omit<AuthUser, "authMode">> = {
  BLOOD_CENTRE: {
    email: "centre@example.invalid",
    role: "BLOOD_CENTRE",
    facilityId: "FAC_CBE_SNBC",
    facilityName: "Coimbatore SNS Blood Centre",
  },
  HOSPITAL: {
    email: "hospital@example.invalid",
    role: "HOSPITAL",
    facilityId: "FAC_CBE_KMCH",
    facilityName: "Kovai Medical Centre and Hospital",
  },
  COORDINATOR: {
    email: "coordinator@example.invalid",
    role: "COORDINATOR",
    facilityId: "COORDINATOR",
    facilityName: "Regional Blood Coordination Centre",
  },
};

export const LANDING_PATHS: Record<Role, string> = {
  BLOOD_CENTRE: "/centre/stock",
  HOSPITAL: "/hospital/inbox",
  COORDINATOR: "/coordinator/escalations",
};

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  facilityId: string | null;
  facilityName: string | null;
  isAuthenticated: boolean;
  /** True when the session came from the persona fallback rather than Cognito. */
  isDemoAuth: boolean;
  /** Set while a restored Cognito session is being revalidated on boot. */
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAs: (role: Role) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    // A stored blob without a role is not a session we can trust.
    if (!parsed?.role || !parsed?.facilityId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCognitoConfigured(): boolean {
  return Boolean(import.meta.env.VITE_USER_POOL_ID && import.meta.env.VITE_USER_POOL_CLIENT_ID);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isRestoring, setIsRestoring] = useState<boolean>(() => {
    const stored = readStoredUser();
    return stored?.authMode === "cognito";
  });

  const saveUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // A browser with storage disabled still works for the life of the tab.
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      // Cognito is the primary path whenever a user pool is configured.
      if (isCognitoConfigured()) {
        try {
          await signOut().catch(() => {});
          await signIn({ username: email, password });
          const session = await fetchAuthSession({ forceRefresh: true });
          const idToken = session.tokens?.idToken;
          const claims = idToken?.payload as Record<string, unknown> | undefined;

          const role = claims?.["custom:role"] as Role | undefined;
          const facilityId = claims?.["custom:facilityId"] as string | undefined;

          if (!role || !facilityId) {
            throw new Error(
              "Signed in, but this account is missing its custom:role or custom:facilityId claim.",
            );
          }

          const next: AuthUser = {
            email,
            role,
            facilityId,
            facilityName:
              Object.values(DEMO_PERSONAS).find((p) => p.facilityId === facilityId)?.facilityName ??
              facilityId,
            authMode: "cognito",
            token: idToken?.toString(),
          };
          saveUser(next);
          return next;
        } catch (err) {
          // Fall through to the persona path, but say so rather than pretending
          // the Cognito sign-in succeeded.
          console.warn("Cognito sign-in failed, falling back to demo persona:", err);
        }
      }

      // Persona fallback. It matches a known demo account and nothing else —
      // inventing a session for an unrecognised email would hand someone
      // another facility's data.
      const persona = Object.values(DEMO_PERSONAS).find((p) => p.email === email);
      if (!persona) {
        throw new Error(
          "No account matches that email. Use a demo persona below, or configure a Cognito user pool.",
        );
      }

      const next: AuthUser = { ...persona, authMode: "demo" };
      saveUser(next);
      return next;
    },
    [saveUser],
  );

  const loginAs = useCallback(
    (role: Role): Promise<AuthUser> => login(DEMO_PERSONAS[role].email, DEMO_PASSWORD),
    [login],
  );

  const logout = useCallback(() => {
    signOut().catch(() => {});
    saveUser(null);
  }, [saveUser]);

  // A restored Cognito session carries a token that may have expired while the
  // tab was closed. Refresh it once on boot rather than letting every query
  // fail with a 401.
  useEffect(() => {
    const stored = readStoredUser();
    if (stored?.authMode !== "cognito") {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await fetchAuthSession({ forceRefresh: true });
        const idToken = session.tokens?.idToken;
        if (cancelled) return;
        if (idToken) {
          saveUser({ ...stored, token: idToken.toString() });
        } else {
          saveUser(null);
        }
      } catch {
        if (!cancelled) saveUser(null);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [saveUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        facilityId: user?.facilityId ?? null,
        facilityName: user?.facilityName ?? null,
        isAuthenticated: user !== null,
        isDemoAuth: user?.authMode === "demo",
        isRestoring,
        login,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
