/**
 * frontend/src/auth/RequireAuth.tsx
 *
 * Gate for every route that is not /login. An unauthenticated visit is sent to
 * the login page carrying where it was going, so signing in resumes the journey
 * instead of dumping the user on a role landing page.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isRestoring } = useAuth();
  const location = useLocation();

  // A restored Cognito session is revalidating; redirecting now would bounce a
  // signed-in user to /login for a frame.
  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-text-muted">Restoring your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
};
