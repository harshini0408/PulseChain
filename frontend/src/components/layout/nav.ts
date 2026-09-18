/**
 * One nav definition, read by both the desktop sidebar and the mobile tab bar,
 * so the two can never drift. The tab bar shows at most five items — every
 * role's list is already within that.
 */

import { BarChart3, FileText, Inbox, Map, Droplets, Truck, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "../../auth/AuthProvider";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  /** Sidebar label. */
  label: string;
  /** Tab-bar label — short enough for a 390px viewport. */
  short: string;
}

const IMPACT: NavItem = { to: "/impact", icon: BarChart3, label: "Network impact", short: "Impact" };

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  BLOOD_CENTRE: [
    { to: "/centre/stock", icon: Droplets, label: "Stock console", short: "Stock" },
    IMPACT,
  ],
  HOSPITAL: [
    { to: "/hospital/inbox", icon: Inbox, label: "Offer inbox", short: "Inbox" },
    { to: "/hospital/requisitions", icon: FileText, label: "Requisitions", short: "Requests" },
    { to: "/hospital/transfers", icon: Truck, label: "Transfers", short: "Transfers" },
    IMPACT,
  ],
  COORDINATOR: [
    { to: "/coordinator/escalations", icon: Map, label: "Escalation map", short: "Map" },
    { to: "/coordinator/parse", icon: Wand2, label: "Request parser", short: "Parse" },
    IMPACT,
  ],
  COMMUNITY_COORDINATOR: [
    { to: "/community/console", icon: Map, label: "Community Console", short: "Console" },
    IMPACT,
  ],
  DONOR: [
    { to: "/donor/dashboard", icon: Map, label: "Donor Dashboard", short: "Dashboard" },
    IMPACT,
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  BLOOD_CENTRE: "Blood centre",
  HOSPITAL: "Hospital",
  COORDINATOR: "Coordinator",
  COMMUNITY_COORDINATOR: "Community Network",
  DONOR: "Blood Donor",
};
