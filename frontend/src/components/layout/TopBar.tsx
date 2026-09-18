/**
 * Facility identity, connection health, and the way out.
 *
 * The "Demo auth" chip is deliberate: when the session came from the persona
 * fallback rather than Cognito, the interface says so. Nobody watching a demo
 * should have to guess whether the auth in front of them is real.
 */

import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup } from "../../api/hooks";
import { Badge } from "../ui/Badge";
import { ConnectionDot } from "./ConnectionDot";
import { RoleSwitcher } from "./RoleSwitcher";
import { ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";

export function TopBar() {
  const { role, facilityId, facilityName, isDemoAuth, logout } = useAuth();
  const { nameOf } = useFacilityLookup();
  const navigate = useNavigate();

  const displayName = facilityId ? nameOf(facilityId) : (facilityName ?? "—");

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-surface-raised px-4 lg:px-6">
      {/* The mark only appears here on small screens; the sidebar carries it above 1024px. */}
      <span className="flex items-center gap-2 text-accent lg:hidden">
        <Logo className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-text">{displayName}</p>
        <div className="flex items-center gap-2">
          {role && <p className="text-2xs text-text-muted">{ROLE_LABEL[role]}</p>}
          <span className="text-2xs text-border-strong" aria-hidden="true">
            ·
          </span>
          <ConnectionDot showLabel={false} />
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {isDemoAuth && (
          <Badge variant="outline" className="hidden sm:inline-flex" title="Signed in with a demo persona, not Cognito">
            Demo auth
          </Badge>
        )}
        <RoleSwitcher />
        <button
          type="button"
          onClick={signOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
