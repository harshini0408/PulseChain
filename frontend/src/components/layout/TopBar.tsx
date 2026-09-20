/**
 * Facility identity, connection health, and the way out.
 *
 * The "Demo auth" chip is deliberate: when the session came from the persona
 * fallback rather than Cognito, the interface says so. Nobody watching a demo
 * should have to guess whether the auth in front of them is real.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Hospital, Radio } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup } from "../../api/hooks";
import { Badge } from "../ui/Badge";
import { ConnectionDot } from "./ConnectionDot";
import { RoleSwitcher } from "./RoleSwitcher";
import { ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";
import { SoundToggle } from "../ui/SoundToggle";
import { BloodDropIntro } from "../intro/BloodDropIntro";
import { soundManager } from "../../lib/soundManager";

export function TopBar() {
  const { role, facilityId, facilityName, isDemoAuth, logout } = useAuth();
  const { nameOf } = useFacilityLookup();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = facilityId ? nameOf(facilityId) : (facilityName ?? "—");

  const handleSignOut = () => {
    soundManager.play("pulse");
    setIsLoggingOut(true);
  };

  const handleLogoutComplete = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border/60 bg-surface-raised/85 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30 transition-colors">
        {/* The mark only appears here on small screens; the sidebar carries it above 1024px. */}
        <span className="flex items-center gap-2 text-accent lg:hidden">
          <Logo className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-text">{displayName}</p>
          <div className="flex items-center gap-2">
            {role && (
              <p className="inline-flex items-center gap-1.5 text-2xs text-text-muted">
                {role === "BLOOD_CENTRE" && <Building2 className="h-3 w-3 text-accent" />}
                {role === "HOSPITAL" && <Hospital className="h-3 w-3 text-accent" />}
                {role === "COORDINATOR" && <Radio className="h-3 w-3 text-accent" />}
                <span>{ROLE_LABEL[role]}</span>
              </p>
            )}
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
          <SoundToggle />
          <RoleSwitcher />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Blood drop splatter animation shown on logout, navigating to Landing Page on complete */}
      {isLoggingOut && (
        <BloodDropIntro onComplete={handleLogoutComplete} />
      )}
    </>
  );
}

export default TopBar;
