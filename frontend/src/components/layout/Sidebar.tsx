import { NavLink } from "react-router-dom";
import { Building2, Hospital, Radio } from "lucide-react";
import { useAuth, type Role } from "../../auth/AuthProvider";
import { useFacilityLookup } from "../../api/hooks";
import { NAV_BY_ROLE, ROLE_LABEL } from "./nav";
import { Logo } from "./Logo";

const ROLE_ICON: Record<Role, typeof Building2> = {
  BLOOD_CENTRE: Building2,
  HOSPITAL: Hospital,
  COORDINATOR: Radio,
};

export function Sidebar() {
  const { role, facilityId, facilityName } = useAuth();
  const { nameOf } = useFacilityLookup();

  if (!role) return null;

  const items = NAV_BY_ROLE[role];
  const displayName = facilityId ? nameOf(facilityId) : (facilityName ?? "—");
  const RoleIcon = ROLE_ICON[role];

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
            {items.map(({ to, icon: Icon, label }) => (
              <li key={to} className="relative">
                <NavLink
                  to={to}
                  end={to === "/impact"}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-white text-[#990011] shadow-lg shadow-black/20 scale-[1.02]"
                        : "text-white/90 hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon
                        className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-[#990011]" : "text-white/90"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>



        {/* Footer with Signed-in Info */}
        <div className="px-5 py-4 border-t border-white/15 bg-black/20 backdrop-blur-xs">
          <p className="text-2xs font-bold uppercase tracking-widest text-white/60">
            Signed in as
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white truncate">
            {displayName}
          </p>
        </div>
      </div>
    </aside>
  );
}
