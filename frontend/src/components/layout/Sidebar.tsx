import { NavLink } from "react-router-dom";
import { LogOut, Building2, Hospital, Radio } from "lucide-react";
import { useAuth, type Role } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery } from "../../api/hooks";
import { NAV_BY_ROLE, ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";

const ROLE_ICON: Record<Role, typeof Building2> = {
  BLOOD_CENTRE: Building2,
  HOSPITAL: Hospital,
  COORDINATOR: Radio,
};

export function Sidebar() {
  const { role, facilityId, facilityName, logout } = useAuth();
  const { nameOf } = useFacilityLookup();
  const inbox = useInboxQuery(role === "HOSPITAL" ? facilityId : null);

  if (!role) return null;

  const items = NAV_BY_ROLE[role];
  const displayName = facilityId ? nameOf(facilityId) : (facilityName ?? "—");
  const RoleIcon = ROLE_ICON[role];

  // Calculate open offers count for hospital inbox badge
  const openOffersCount = (inbox.data ?? []).filter((o) => o.status === "OPEN").length;

  return (
    <aside
      className="flex h-full w-64 flex-col bg-cover bg-top bg-no-repeat text-white shadow-2xl relative select-none overflow-hidden"
      style={{
        backgroundImage: "url('/image (3) (1) (1) (1).png')",
      }}
    >
      {/* Subtle overlay gradient to ensure clean text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Branding */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md flex-shrink-0">
            <Logo className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-xl font-bold tracking-tight text-white block leading-tight truncate">
              PulseChain
            </span>
            <span className="text-2xs font-medium text-white/80 tracking-wide block truncate">
              Every Drop Counts
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-2" aria-label="Main navigation">
          {/* Role Header with Role Icon */}
          <div className="mb-3 px-3 flex items-center gap-2 text-white/80">
            <RoleIcon className="h-4 w-4 text-white flex-shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest text-white leading-none">
              {ROLE_LABEL[role]}
            </p>
          </div>

          <ul className="space-y-2">
            {items.map(({ to, icon: Icon, label }) => {
              const isInbox = to === "/hospital/inbox";
              const badgeCount = isInbox ? openOffersCount : null;

              return (
                <li key={to} className="relative">
                  <NavLink
                    to={to}
                    end={to === "/impact"}
                    className={({ isActive }) =>
                      [
                        "group relative flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                        isActive
                          ? "bg-white text-[#990011] shadow-lg shadow-black/20 scale-[1.02]"
                          : "text-white/90 hover:bg-white/10 hover:text-white",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Icon
                            className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? "text-[#990011]" : "text-white/90"
                            }`}
                          />
                          <span className="truncate">{label}</span>
                        </div>

                        {badgeCount !== null && badgeCount > 0 && (
                          <span
                            className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold shadow-sm ${
                              isActive
                                ? "bg-[#990011] text-white"
                                : "bg-white text-[#990011]"
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>



        {/* Footer with Signed-in Info & Sign Out */}
        <div className="px-5 py-4 border-t border-white/15 bg-black/20 backdrop-blur-xs">
          <div className="mb-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-white/60">
              Signed in as
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white truncate">
              {displayName}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white group"
          >
            <LogOut className="h-4 w-4 text-white/80 transition-transform group-hover:-translate-x-0.5 group-hover:text-white" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
