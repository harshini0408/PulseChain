/**
 * frontend/src/auth/RequireRole.tsx
 *
 * Role gate, layered inside RequireAuth. By the time this renders the user is
 * known to be signed in, so the only decision left is whether this role may see
 * this route. A role that may not is sent to its own landing page rather than
 * shown a dead end.
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { LANDING_PATHS, useAuth, type Role } from "./AuthProvider";

export const RequireRole: React.FC<{
  allowedRoles: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { role } = useAuth();

  if (!role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    return <Navigate to={LANDING_PATHS[role]} replace />;
  }

  return <>{children}</>;
};
