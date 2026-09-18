/**
 * Desktop navigation (>=1024px). Below that the tab bar takes over and this is
 * not rendered at all — there is no drawer, because a drawer hides the one
 * thing a phone user needs constantly.
 */

import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup } from "../../api/hooks";
import { NAV_BY_ROLE, ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";

export function Sidebar() {
  const { role, facilityId, facilityName } = useAuth();
  const { nameOf } = useFacilityLookup();

  if (!role) return null;

  const items = NAV_BY_ROLE[role];
  // Prefer the canonical name from /facilities over whatever the token carried.
  const displayName = facilityId ? nameOf(facilityId) : (facilityName ?? "—");

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-bg">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <span className="text-sidebar-text-active">
          <Logo className="h-6 w-6" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-sidebar-text-active">
          PulseChain
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
        <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-widest text-sidebar-text/60">
          {ROLE_LABEL[role]}
        </p>
        <ul className="space-y-1">
          {items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/impact"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-active-bg text-sidebar-text-active"
                      : "text-sidebar-text hover:bg-sidebar-text-active/10 hover:text-sidebar-text-active",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-text/15 px-5 py-4">
        <p className="text-2xs font-semibold uppercase tracking-widest text-sidebar-text/60">
          Signed in as
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-sidebar-text-active">
          {displayName}
        </p>
      </div>
    </aside>
  );
}
