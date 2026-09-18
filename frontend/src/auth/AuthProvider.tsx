/**
 * frontend/src/auth/AuthProvider.tsx
 *
 * Auth context providing user identity, role, facilityId, and token management.
 * Uses sessionStorage (window-scoped) so two side-by-side browser windows can
 * operate under different user roles simultaneously without session collisions.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { signIn, signOut, getCurrentUser, fetchAuthSession } from "aws-amplify/auth";

export type Role = "BLOOD_CENTRE" | "HOSPITAL" | "COORDINATOR" | "DONOR" | "COMMUNITY_COORDINATOR";

export interface AuthUser {
  email: string;
  role: Role;
  facilityId: string;
  facilityName: string;
  token?: string;
}

export const DEMO_PERSONAS: Record<Role, AuthUser> = {
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
  COMMUNITY_COORDINATOR: {
    email: "community@example.invalid",
    role: "COMMUNITY_COORDINATOR",
    facilityId: "COM_001",
    facilityName: "South India Rotary Trust",
  },
  DONOR: {
    email: "donor@example.invalid",
    role: "DONOR",
    facilityId: "DONOR_123",
    facilityName: "Prakash Kumar",
  },
};

interface AuthContextType {
  user: AuthUser | null;
  role: Role | null;
  facilityId: string | null;
  facilityName: string | null;
  isAuthenticated: boolean;
  loginAs: (role: Role) => void | Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "pulsechain_session_user";

const DEMO_PASSWORD = "PulseChain2026!";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : DEMO_PERSONAS.BLOOD_CENTRE; // Default to Blood Centre if unassigned
    } catch {
      return DEMO_PERSONAS.BLOOD_CENTRE;
    }
  });

  const saveUser = (u: AuthUser | null) => {
    setUser(u);
    if (u) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  const login = async (email: string, pass: string) => {
    // If real Cognito is configured, attempt Amplify signIn
    if (import.meta.env.VITE_USER_POOL_ID) {
      try {
        await signOut().catch(() => {});
        await signIn({ username: email, password: pass });
        const session = await fetchAuthSession({ forceRefresh: true });
        const idToken = session.tokens?.idToken;
        const claims = idToken?.payload as Record<string, any> | undefined;

        const role = (claims?.["custom:role"] as Role) ?? "BLOOD_CENTRE";
        const facilityId = (claims?.["custom:facilityId"] as string) ?? "FAC_CBE_SNBC";
        const facilityName =
          Object.values(DEMO_PERSONAS).find((p) => p.facilityId === facilityId)?.facilityName ??
          facilityId;

        saveUser({
          email,
          role,
          facilityId,
          facilityName,
          token: idToken?.toString(),
        });
        return;
      } catch (err) {
        console.warn("Amplify sign-in failed:", err);
      }
    }

    // Fallback persona match
    const matched = Object.values(DEMO_PERSONAS).find((p) => p.email === email);
    if (matched) {
      saveUser(matched);
    } else {
      saveUser({
        email,
        role: "HOSPITAL",
        facilityId: "FAC_CBE_KMCH",
        facilityName: "Kovai Medical Centre and Hospital",
      });
    }
  };

  const loginAs = async (role: Role) => {
    const persona = DEMO_PERSONAS[role];
    saveUser(persona);
    await login(persona.email, DEMO_PASSWORD);
  };

  // Ensure active Cognito token on startup
  useEffect(() => {
    if (user && !user.token) {
      login(user.email, DEMO_PASSWORD).catch(() => {});
    }
  }, []);

  const logout = () => {
    try {
      signOut().catch(() => {});
    } catch {}
    saveUser(null);
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (!user?.token) return {};
    return {
      Authorization: `Bearer ${user.token}`,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        facilityId: user?.facilityId ?? null,
        facilityName: user?.facilityName ?? null,
        isAuthenticated: !!user,
        loginAs,
        login,
        logout,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
