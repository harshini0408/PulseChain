/**
 * Desktop navigation (>=1024px). Below that the tab bar takes over and this is
 * not rendered at all — there is no drawer, because a drawer hides the one
 * thing a phone user needs constantly.
 */

import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup } from "../../api/hooks";
import { NAV_BY_ROLE, ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";
import { PulseLine } from "../motion/PulseLine";

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
            <li key={to} className="relative">
              <NavLink
                to={to}
                end={to === "/impact"}
                className={({ isActive }) =>
                  [
                    "relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-sidebar-text-active font-semibold"
                      : "text-sidebar-text hover:text-sidebar-text-active",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-sidebar-active-bg -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        isActive ? "scale-110" : ""
                      }`}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Living network heartbeat in sidebar footer */}
      <div className="px-5 py-2">
        <PulseLine height={16} color="hsl(var(--sidebar-active-bg))" className="opacity-40" />
      </div>

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
