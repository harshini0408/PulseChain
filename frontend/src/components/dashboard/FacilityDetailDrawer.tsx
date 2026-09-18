/**
 * FacilityDetailDrawer.tsx
 *
 * Operational profile drawer for any facility selected from "The network" on the Impact page.
 * Provides:
 * 1. Facility identity (Name, Type badge, City, Contact, Status)
 * 2. Proximity: Haversine distance from logged-in facility (e.g. "8.4 km from Coimbatore SNS")
 * 3. Operational status & Network relationship (Active partner since Aug 2026)
 * 4. Current demand snapshot (Open requisitions or standing demand profile)
 * 5. Rescue rationale & compatibility factors
 * 6. PulseChain activity & recent operational interactions (Transfers, Offers, Claims)
 * 7. Accessible drawer with Escape key, backdrop click, and clean responsive bottom-sheet on mobile.
 */

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hospital,
  Mail,
  MapPin,
  Navigation,
  Radio,
  Share2,
  X,
} from "lucide-react";
import type { Facility } from "@pulsechain/shared";
import { haversineKm } from "../../lib/geo";
import { Badge } from "../ui/Badge";
import { StatusPill } from "../ui/StatusPill";
import { ComponentClockBadge } from "../stock/ComponentClockBadge";
import { useAuth } from "../../auth/AuthProvider";

interface FacilityDetailDrawerProps {
  facility: Facility | null;
  originFacility: Facility | null;
  onClose: () => void;
}

// Deterministic mock / seeded activity derived reliably per facility ID
interface FacilityOperationalData {
  successfulTransfers: number;
  offersReceived: number;
  responseRatePct: number;
  avgResponseTime: string;
  partnerSince: string;
  recentActivity: Array<{
    id: string;
    type: "ACCEPTED" | "RECEIVED" | "DECLINED" | "EXPIRED";
    title: string;
    detail: string;
    date: string;
  }>;
  activeDemand: Array<{
    component: "PLATELETS" | "RBC" | "PLASMA";
    group: string;
    units: number;
    urgency: "CRITICAL" | "HIGH" | "NORMAL";
  }>;
}

function getFacilityOperationalData(facilityId: string): FacilityOperationalData {
  switch (facilityId) {
    case "FAC_CBE_KMCH":
      return {
      successfulTransfers: 18,
      offersReceived: 21,
      responseRatePct: 95,
      avgResponseTime: "3m 45s",
      partnerSince: "Aug 2026",
      activeDemand: [
        { component: "PLATELETS", group: "O+", units: 2, urgency: "HIGH" },
        { component: "RBC", group: "O+", units: 3, urgency: "NORMAL" },
        { component: "PLASMA", group: "AB+", units: 1, urgency: "NORMAL" },
      ],
      recentActivity: [
        {
          id: "act-1",
          type: "RECEIVED",
          title: "Platelet transfer received",
          detail: "2 units (PLT-102 / PLT-103) from SNS Blood Centre",
          date: "Today, 14:32",
        },
        {
          id: "act-2",
          type: "ACCEPTED",
          title: "Offer accepted",
          detail: "O+ Platelets (1 unit) within Ring 1 window",
          date: "18 Sept, 11:15",
        },
        {
          id: "act-3",
          type: "DECLINED",
          title: "Offer declined",
          detail: "A+ Platelets (2 units) · Target quota already fulfilled",
          date: "16 Sept, 09:40",
        },
      ],
    };

    case "FAC_CBE_GH":
      return {
      successfulTransfers: 24,
      offersReceived: 27,
      responseRatePct: 92,
      avgResponseTime: "4m 10s",
      partnerSince: "Aug 2026",
      activeDemand: [
        { component: "PLATELETS", group: "B+", units: 1, urgency: "NORMAL" },
        { component: "RBC", group: "B+", units: 2, urgency: "HIGH" },
        { component: "PLASMA", group: "O+", units: 1, urgency: "NORMAL" },
      ],
      recentActivity: [
        {
          id: "act-4",
          type: "RECEIVED",
          title: "RBC unit received",
          detail: "2 units (B+) Emergency trauma support",
          date: "Yesterday, 19:20",
        },
        {
          id: "act-5",
          type: "ACCEPTED",
          title: "Platelet rescue accepted",
          detail: "B+ Platelets · Escrow confirmation locked",
          date: "17 Sept, 16:05",
        },
      ],
    };

    case "FAC_CBE_PSGIMS":
      return {
      successfulTransfers: 14,
      offersReceived: 16,
      responseRatePct: 88,
      avgResponseTime: "5m 30s",
      partnerSince: "Aug 2026",
      activeDemand: [
        { component: "PLATELETS", group: "O+", units: 1, urgency: "CRITICAL" },
        { component: "RBC", group: "A+", units: 2, urgency: "NORMAL" },
      ],
      recentActivity: [
        {
          id: "act-6",
          type: "ACCEPTED",
          title: "Critical requisition broadcast",
          detail: "O+ Platelets · Active rescue matched",
          date: "Today, 10:18",
        },
        {
          id: "act-7",
          type: "RECEIVED",
          title: "Platelet transfer received",
          detail: "1 unit (O+) dispatched under 22 mins",
          date: "15 Sept, 14:10",
        },
      ],
    };

    case "FAC_CBE_SRMC":
      return {
      successfulTransfers: 9,
      offersReceived: 11,
      responseRatePct: 82,
      avgResponseTime: "6m 15s",
      partnerSince: "Aug 2026",
      activeDemand: [
        { component: "PLATELETS", group: "A+", units: 1, urgency: "NORMAL" },
      ],
      recentActivity: [
        {
          id: "act-8",
          type: "ACCEPTED",
          title: "Offer accepted",
          detail: "A+ Platelets from Coimbatore SNS Blood Centre",
          date: "14 Sept, 12:45",
        },
      ],
    };

    case "FAC_CBE_SNBC":
      return {
      successfulTransfers: 42,
      offersReceived: 0,
      responseRatePct: 98,
      avgResponseTime: "1m 40s",
      partnerSince: "Jul 2026",
      activeDemand: [],
      recentActivity: [
        {
          id: "act-9",
          type: "ACCEPTED",
          title: "Dispatched rescue unit",
          detail: "O+ Platelets (6h expiry) to KMCH",
          date: "Today, 14:15",
        },
        {
          id: "act-10",
          type: "RECEIVED",
          title: "Inventory restocked",
          detail: "Batch collected at 09:00 IST",
          date: "Today, 09:30",
        },
      ],
    };

    case "FAC_CBE_RBANKS":
      return {
      successfulTransfers: 31,
      offersReceived: 2,
      responseRatePct: 94,
      avgResponseTime: "2m 50s",
      partnerSince: "Jul 2026",
      activeDemand: [],
      recentActivity: [
        {
          id: "act-11",
          type: "ACCEPTED",
          title: "Escalation initiated",
          detail: "AB- Platelet unit entered Ring 1 escalation",
          date: "Yesterday, 18:30",
        },
      ],
    };

    default:
      // Other regional corridor facilities
      return {
      successfulTransfers: 6,
      offersReceived: 8,
      responseRatePct: 85,
      avgResponseTime: "7m 20s",
      partnerSince: "Aug 2026",
      activeDemand: [
        { component: "RBC", group: "O+", units: 1, urgency: "NORMAL" },
      ],
      recentActivity: [
        {
          id: "act-def",
          type: "ACCEPTED",
          title: "Corridor check-in confirmed",
          detail: "Inventory heartbeat active",
          date: "12 Sept, 10:00",
        },
      ],
    };
  }
}

export function FacilityDetailDrawer({
  facility,
  originFacility,
  onClose,
}: FacilityDetailDrawerProps) {
  const { user } = useAuth();

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (facility) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [facility, onClose]);

  // Compute real haversine distance
  const distanceKm = useMemo(() => {
    if (!facility || !originFacility) return null;
    if (facility.facilityId === originFacility.facilityId) return 0;
    return haversineKm(originFacility.lat, originFacility.lng, facility.lat, facility.lng);
  }, [facility, originFacility]);

  // Operational metrics
  const opData = useMemo(() => {
    if (!facility) return null;
    return getFacilityOperationalData(facility.facilityId);
  }, [facility]);

  if (!facility) return null;

  const isCurrentCentre = originFacility?.facilityId === facility.facilityId;
  const isHospital = facility.type === "HOSPITAL";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-brand-oxblood/40 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <motion.aside
          initial={{ x: "100%", opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-surface-raised shadow-2xl"
          role="dialog"
          aria-labelledby="facility-drawer-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border bg-surface px-6 py-5">
            <div className="min-w-0 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                  {isHospital ? "Hospital profile" : "Blood centre node"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-status-received-bg px-2 py-0.5 text-2xs font-bold text-status-received">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-received" />
                  Active
                </span>
              </div>

              <h2
                id="facility-drawer-title"
                className="mt-1 font-display text-xl font-bold leading-snug text-text"
              >
                {facility.name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-text-subtle" />
                  {facility.city}, Tamil Nadu
                </span>
                <span>•</span>
                <Badge variant={isHospital ? "outline" : "accent"}>
                  {isHospital ? "Hospital" : "Blood Centre"}
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-xl border border-border bg-surface-raised p-2 text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body content scrollable */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* 1. Proximity & Corridor Context */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                <span className="flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-accent" />
                  Network proximity
                </span>
                <span>Haversine distance</span>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums text-text" data-numeric="true">
                  {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "—"}
                </span>
                <span className="text-xs text-text-muted">
                  {isCurrentCentre
                    ? "Current logged-in facility"
                    : `from ${originFacility?.name ?? "your centre"}`}
                </span>
              </div>

              {!isCurrentCentre && (
                <p className="mt-1.5 text-2xs text-text-subtle">
                  {distanceKm !== null && distanceKm <= 10
                    ? "Within Ring 1 (0–10 km) — first-priority redistribution band"
                    : distanceKm !== null && distanceKm <= 25
                      ? "Within Ring 2 (10–25 km) — second-tier escalation corridor"
                      : "Within Ring 3 (>25 km) — broad corridor regional partner"}
                </p>
              )}
            </div>

            {/* 2. Current Demand Snapshot (Why this facility matters) */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Current demand snapshot
                </h3>
                <span className="text-2xs text-text-subtle">Live requisitions</span>
              </div>

              {opData && opData.activeDemand.length > 0 ? (
                <div className="space-y-2">
                  {opData.activeDemand.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface font-display text-sm font-bold text-text">
                          {d.group}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-text">
                              {d.units} {d.units === 1 ? "unit" : "units"}
                            </span>
                            <ComponentClockBadge component={d.component} size="sm" />
                          </div>
                          <span className="text-2xs text-text-subtle">Standing requirement</span>
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider",
                          d.urgency === "CRITICAL"
                            ? "bg-accent-soft text-accent"
                            : d.urgency === "HIGH"
                              ? "bg-status-in-transit-bg text-status-in-transit"
                              : "bg-surface-sunken text-text-muted",
                        ].join(" ")}
                      >
                        {d.urgency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-muted">
                  {isHospital
                    ? "No open blood-component requisitions currently registered."
                    : "Blood centre node — acts primarily as supply origin in redistribution."}
                </div>
              )}
            </div>

            {/* 3. Why this facility matters for rescues */}
            {isHospital && (
              <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Why this facility matters in rescues
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-text">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-received" />
                    <span>
                      Equipped with validated cold-chain reception for{" "}
                      <strong>{facility.components.join(", ")}</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-received" />
                    <span>
                      Average claim response time of{" "}
                      <strong>{opData?.avgResponseTime ?? "under 5m"}</strong> within active offer windows.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-received" />
                    <span>
                      Direct arterial transit route from Coimbatore centre (~15-25m drive time).
                    </span>
                  </li>
                </ul>
              </div>
            )}

            {/* 4. PulseChain Activity Summary */}
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                PulseChain network activity
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-surface p-3 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-text">
                    {opData?.successfulTransfers ?? 0}
                  </p>
                  <p className="mt-0.5 text-2xs uppercase tracking-wider text-text-subtle">
                    Transfers
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-text">
                    {opData?.offersReceived ?? 0}
                  </p>
                  <p className="mt-0.5 text-2xs uppercase tracking-wider text-text-subtle">
                    Offers
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3 text-center">
                  <p className="font-display text-xl font-bold tabular-nums text-status-received">
                    {opData?.responseRatePct ?? 0}%
                  </p>
                  <p className="mt-0.5 text-2xs uppercase tracking-wider text-text-subtle">
                    Response
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Recent Operational Interactions */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Recent operational activity
                </h3>
                <span className="text-2xs text-text-subtle">Corridor audit trail</span>
              </div>

              {opData && opData.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {opData.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-surface p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">{item.title}</span>
                        <span className="text-2xs tabular-nums text-text-subtle">
                          {item.date}
                        </span>
                      </div>
                      <p className="mt-1 text-2xs text-text-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No recent corridor activity logged.</p>
              )}
            </div>

            {/* 6. Facility Metadata Footer */}
            <div className="border-t border-border pt-4 text-xs text-text-subtle">
              <div className="flex items-center justify-between py-1">
                <span>Contact email:</span>
                <span className="font-mono text-text">{facility.contactEmail}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Facility ID:</span>
                <span className="font-mono text-text">{facility.facilityId}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Partner since:</span>
                <span className="text-text">{opData?.partnerSince ?? "Aug 2026"}</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="border-t border-border bg-surface p-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-border bg-surface-raised py-2.5 text-xs font-semibold text-text shadow-xs transition-colors hover:border-border-strong hover:bg-surface"
            >
              Close facility details
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
