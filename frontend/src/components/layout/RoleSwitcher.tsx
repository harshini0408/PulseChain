/**
 * Demo-only persona switch. Changing role means signing in as a different
 * account, so this goes through the same login path as the login page rather
 * than mutating role in place — otherwise the token and the role disagree.
 *
 * Hidden outside demo mode.
 */

import { useNavigate } from "react-router-dom";
import { LANDING_PATHS, useAuth, type Role } from "../../auth/AuthProvider";
import { ROLE_LABEL } from "./nav";

const ROLES: Role[] = ["BLOOD_CENTRE", "HOSPITAL", "COORDINATOR", "COMMUNITY_COORDINATOR", "DONOR"];

export function RoleSwitcher() {
  const { role, loginAs } = useAuth();
  const navigate = useNavigate();

  if (import.meta.env.VITE_DEMO_MODE !== "true" || !role) return null;

  const onChange = async (next: Role) => {
    await loginAs(next);
    navigate(LANDING_PATHS[next], { replace: true });
  };

  return (
    <select
      value={role}
      onChange={(e) => void onChange(e.target.value as Role)}
      aria-label="Switch demo persona"
      className="hidden rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong sm:block"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}
