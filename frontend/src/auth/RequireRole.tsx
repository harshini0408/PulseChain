/**
 * frontend/src/auth/RequireRole.tsx
 *
 * Route guard component.
 * Redirects unauthorized users directly to their designated landing page
 * rather than showing a 403 error page.
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "./AuthProvider";

const LANDING_PATHS: Record<Role, string> = {
  BLOOD_CENTRE: "/centre/stock",
  HOSPITAL: "/hospital/inbox",
  COORDINATOR: "/coordinator/escalations",
  DONOR: "/donor/dashboard",
  COMMUNITY_COORDINATOR: "/community/console",
};

export const RequireRole: React.FC<{
  allowedRoles: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, role, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(role)) {
    const target = LANDING_PATHS[role] ?? "/login";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
