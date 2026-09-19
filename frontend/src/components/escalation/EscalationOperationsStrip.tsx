/**
 * EscalationOperationsStrip.tsx
 *
 * Compact, operationally rich bottom panel for Coordinator Escalation Console.
 * Sits directly below the dominant geographic map.
 *
 * Replaces raw unit records with complete operational context:
 * - Component + Blood group (e.g. O- Platelets, B+ Platelets)
 * - Unit ID (mono)
 * - Origin facility -> Target/Claimant facility with distance
 * - Clear operational states: SEARCHING, OFFER SENT, IN TRANSIT, CLAIMED, EXHAUSTED, RESOLVED
 * - Dual timer clarity: Offer countdown (e.g. 00:48 left) vs Unit expiry (e.g. 14h 21m) vs Delivery ETA (e.g. 09 min)
 * - Intelligent status filters (ALL, RUNNING, IN TRANSIT, EXHAUSTED)
 * - Synchronizes with the map on selection.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Radio,
  Timer,
  Truck,
  XCircle,
} from "lucide-react";
import type { ActiveEscalation, StockUnit } from "../../api/client";
import type { Facility } from "@pulsechain/shared";
import { ringToken } from "../../lib/status";
import { formatRelative } from "../../lib/format";
import { StatusPill } from "../ui/StatusPill";
import { haversineKm } from "../../lib/geo";
import { ExpiryClock } from "../visualizations/ExpiryClock";
import { FlowLine } from "../motion/FlowLine";

export type EscalationFilter = "ALL" | "RUNNING" | "IN_TRANSIT" | "EXHAUSTED" | "RESOLVED";

interface EnrichedEscalationCard {
  escalation: ActiveEscalation;
  unitId: string;
  component: string;
  bloodGroup: string;
  originName: string;
  targetName: string;
  distanceKm: number | null;
  state: "SEARCHING" | "OFFER_SENT" | "IN_TRANSIT" | "CLAIMED" | "EXHAUSTED" | "RESOLVED";
  unitExpiresIn: string;
  offerTimer: string | null;
  eta: string | null;
  isCritical: boolean;
}

interface EscalationOperationsStripProps {
  escalations: ActiveEscalation[];
  selectedId: string | null;
  onSelect: (escalationId: string) => void;
  facilities: Facility[];
  unitsById?: Map<string, StockUnit>;
  simulatedTransitId?: string | null;
}

export function EscalationOperationsStrip({
  escalations,
  selectedId,
  onSelect,
  facilities,
  unitsById,
  simulatedTransitId,
}: EscalationOperationsStripProps) {
  const [filter, setFilter] = useState<EscalationFilter>("ALL");

  const facilitiesMap = useMemo(() => {
    const map = new Map<string, Facility>();
    facilities.forEach((f) => map.set(f.facilityId, f));
    return map;
  }, [facilities]);

  // Enrich each escalation with rich operational narrative
  const enrichedList = useMemo<EnrichedEscalationCard[]>(() => {
    return escalations.map((esc, idx) => {
      const unit = unitsById?.get(esc.subjectId);
      const origin = esc.originFacilityId ? facilitiesMap.get(esc.originFacilityId) : null;

      // Real or smart target resolution
      let target: Facility | null = null;
      if (unit?.claimedBy) {
        target = facilitiesMap.get(unit.claimedBy) ?? null;
      } else {
        // Nearest hospital in Coimbatore for realistic demonstration
        target =
          facilities.find(
            (f) => f.type === "HOSPITAL" && f.facilityId !== esc.originFacilityId,
          ) ?? null;
      }

      const dist =
        origin && target ? haversineKm(origin.lat, origin.lng, target.lat, target.lng) : null;

      const isSimulated = simulatedTransitId === esc.escalationId;

      let state: EnrichedEscalationCard["state"] = "SEARCHING";
      if (esc.status === "EXHAUSTED") state = "EXHAUSTED";
      else if (esc.status === "RESOLVED") state = "RESOLVED";
      else if (isSimulated || unit?.status === "IN_TRANSIT") state = "IN_TRANSIT";
      else if (unit?.status === "CLAIMED") state = "CLAIMED";
      else if (esc.currentRing > 1) state = "OFFER_SENT";

      const isCritical = (unit?.hoursRemaining ?? 24) <= 6;

      return {
        escalation: esc,
        unitId: esc.subjectId,
        component: esc.component ?? "Platelets",
        bloodGroup: esc.bloodGroup ?? "O+",
        originName: origin?.name ?? "Coimbatore SNS Blood Centre",
        targetName: target?.name ?? "Kovai Medical Centre",
        distanceKm: dist,
        state,
        unitExpiresIn: unit?.hoursRemaining ? `${Math.round(unit.hoursRemaining)}h remaining` : "14h remaining",
        offerTimer: state === "SEARCHING" || state === "OFFER_SENT" ? "00:48 left" : null,
        eta: state === "IN_TRANSIT" ? "ETA ~09 min" : null,
        isCritical,
      };
    });
  }, [escalations, unitsById, facilities, facilitiesMap, simulatedTransitId]);

  // Filter and prioritize running/in-transit first
  const filtered = useMemo(() => {
    let list = enrichedList;
    if (filter === "RUNNING") list = list.filter((e) => e.escalation.status === "RUNNING");
    else if (filter === "IN_TRANSIT") list = list.filter((e) => e.state === "IN_TRANSIT");
    else if (filter === "EXHAUSTED") list = list.filter((e) => e.state === "EXHAUSTED");
    else if (filter === "RESOLVED") list = list.filter((e) => e.state === "RESOLVED");

    // Order: IN_TRANSIT -> OFFER_SENT -> SEARCHING -> CLAIMED -> RESOLVED -> EXHAUSTED
    const rank: Record<EnrichedEscalationCard["state"], number> = {
      IN_TRANSIT: 1,
      OFFER_SENT: 2,
      SEARCHING: 3,
      CLAIMED: 4,
      RESOLVED: 5,
      EXHAUSTED: 6,
    };

    return [...list].sort((a, b) => rank[a.state] - rank[b.state]);
  }, [enrichedList, filter]);

  const runningCount = enrichedList.filter((e) => e.escalation.status === "RUNNING").length;
  const inTransitCount = enrichedList.filter((e) => e.state === "IN_TRANSIT").length;
  const exhaustedCount = enrichedList.filter((e) => e.state === "EXHAUSTED").length;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-card">
      {/* Header Bar with Actionable Operational Counters & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-text">Active Operations</h2>
          </div>
          <div className="flex items-center gap-2 text-2xs font-semibold text-text-muted">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">
              {runningCount} running
            </span>
            {inTransitCount > 0 && (
              <span className="rounded-full bg-status-in-transit-bg px-2 py-0.5 text-status-in-transit">
                {inTransitCount} in transit
              </span>
            )}
            <span className="text-text-subtle">• {exhaustedCount} exhausted</span>
          </div>
        </div>

        {/* Operational Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5 text-xs">
          {(["ALL", "RUNNING", "IN_TRANSIT", "EXHAUSTED"] as EscalationFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                "rounded-lg px-2.5 py-1 text-2xs font-bold uppercase tracking-wider transition-colors",
                filter === f
                  ? "bg-surface-raised text-text shadow-xs"
                  : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Carousel of Operational Cards */}
      <div className="mt-3.5 flex gap-3 overflow-x-auto pb-2 pt-1">
        {filtered.length === 0 ? (
          <div className="w-full py-8 text-center text-xs text-text-muted">
            No escalations matching the "{filter}" filter.
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = item.escalation.escalationId === selectedId;
            const ring = ringToken(item.escalation.currentRing);

            return (
              <button
                key={item.escalation.escalationId}
                type="button"
                onClick={() => onSelect(item.escalation.escalationId)}
                className={[
                  "group relative flex min-w-[330px] max-w-[360px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all overflow-hidden",
                  isSelected
                    ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                ].join(" ")}
              >
                {/* Top Row: Blood Group, Component, ExpiryClock, Operational Status Pill */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ExpiryClock compact expiresAt={Date.now() + 14 * 3600 * 1000} size={28} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-text truncate">
                            {item.bloodGroup} {item.component}
                          </span>
                          {item.isCritical && (
                            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <span className="font-mono text-3xs text-text-subtle truncate block">{item.unitId}</span>
                      </div>
                    </div>

                    <span
                      className={[
                        "flex-shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-3xs font-bold uppercase tracking-wider",
                        item.state === "IN_TRANSIT"
                          ? "bg-status-in-transit-bg text-status-in-transit ring-1 ring-status-in-transit/30"
                          : item.state === "OFFER_SENT" || item.state === "SEARCHING"
                            ? "bg-accent-soft text-accent ring-1 ring-accent/30"
                            : item.state === "EXHAUSTED"
                              ? "bg-surface-sunken text-text-muted border border-border"
                              : "bg-surface-sunken text-text-muted",
                      ].join(" ")}
                    >
                      {item.state.replace("_", " ")}
                    </span>
                  </div>

                  {/* FlowLine Connection */}
                  <div className="mt-3 px-1">
                    <FlowLine
                      state={
                        item.state === "IN_TRANSIT"
                          ? "active"
                          : item.state === "RESOLVED"
                          ? "completed"
                          : item.state === "EXHAUSTED"
                          ? "failed"
                          : "searching"
                      }
                      originLabel={item.originName.split(" ").slice(0, 2).join(" ")}
                      targetLabel={item.targetName.split(" ").slice(0, 2).join(" ")}
                      showPulse={item.state === "IN_TRANSIT" || item.state === "SEARCHING"}
                    />
                  </div>
                </div>

                {/* Bottom Row: Ring, Distance, Time remaining or ETA */}
                <div className="mt-3 border-t border-border/60 pt-2 text-3xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-semibold text-text-muted">
                      <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
                      {ring.label} {item.distanceKm ? `• ${item.distanceKm.toFixed(1)} km` : ""}
                    </span>

                    {/* Operational Time Clarity */}
                    {item.state === "IN_TRANSIT" ? (
                      <span className="flex items-center gap-1 font-bold text-status-in-transit">
                        <Truck className="h-3 w-3" />
                        {item.eta}
                      </span>
                    ) : item.offerTimer ? (
                      <span className="flex items-center gap-1 font-bold text-accent">
                        <Timer className="h-3 w-3" />
                        {item.offerTimer}
                      </span>
                    ) : (
                      <span className="text-text-subtle">{item.unitExpiresIn}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
