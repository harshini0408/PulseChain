import { NavLink } from "react-router-dom";
import {
  Droplets,
  Inbox,
  FileText,
  Truck,
  Map,
  Zap,
  BarChart2,
  X,
  Heart,
  UserCheck,
  Users,
  Building2,
  UserPlus,
} from "lucide-react";
import { useAuth, type Role } from "../../auth/AuthProvider";

interface SidebarProps {
  onClose?: () => void;
}

const NAV_GROUPS: Record<Role, { label: string; items: { to: string; icon: any; label: string }[] }> = {
  BLOOD_CENTRE: {
    label: "Blood Centre",
    items: [{ to: "/centre/stock", icon: Droplets, label: "Stock Console" }],
  },
  HOSPITAL: {
    label: "Hospital",
    items: [
      { to: "/hospital/inbox", icon: Inbox, label: "Offer Inbox" },
      { to: "/hospital/requisitions", icon: FileText, label: "Requisitions" },
      { to: "/hospital/transfers", icon: Truck, label: "Transfers" },
      { to: "/request/donor", icon: UserPlus, label: "Community Requisition" },
    ],
  },
  COORDINATOR: {
    label: "Coordinator",
    items: [
      { to: "/coordinator/escalations", icon: Map, label: "Escalation Map" },
      { to: "/coordinator/parse", icon: Zap, label: "Parse Request" },
      { to: "/community/console", icon: Users, label: "Community Console" },
    ],
  },
  DONOR: {
    label: "Donor Network",
    items: [
      { to: "/donor/dashboard", icon: Heart, label: "Donor Dashboard" },
      { to: "/donor/register", icon: UserCheck, label: "Register as Donor" },
    ],
  },
  COMMUNITY_COORDINATOR: {
    label: "Community Network",
    items: [
      { to: "/community/console", icon: Users, label: "Community Console" },
      { to: "/community/register", icon: Building2, label: "Register Community" },
    ],
  },
};

export function Sidebar({ onClose }: SidebarProps) {
  const { role } = useAuth();
  const activeRole = role ?? "BLOOD_CENTRE";
  const activeGroup = NAV_GROUPS[activeRole];

  return (
    <aside className="flex h-full w-64 flex-col bg-[hsl(var(--sidebar-bg))]">
      {/* Wordmark */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <Droplets className="h-4 w-4 text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[hsl(var(--sidebar-text-active))]">
            PulseChain
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[hsl(var(--sidebar-text))] hover:text-white transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Active role group */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-text)/0.5)]">
            {activeGroup.label}
          </p>
          <ul className="space-y-0.5">
            {activeGroup.items.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-[hsl(var(--sidebar-active-bg))] text-white"
                        : "text-[hsl(var(--sidebar-text))] hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Impact — always visible */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-text)/0.5)]">
            Network
          </p>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/impact"
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active-bg))] text-white"
                      : "text-[hsl(var(--sidebar-text))] hover:bg-white/10 hover:text-white",
                  ].join(" ")
                }
              >
                <BarChart2 className="h-4 w-4 flex-shrink-0" />
                Impact
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-[11px] text-[hsl(var(--sidebar-text)/0.6)] font-mono">
          Cognito Auth · ap-south-1
        </p>
      </div>
    </aside>
  );
}
