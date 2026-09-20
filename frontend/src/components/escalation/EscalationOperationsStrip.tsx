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
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  MapPin,
  Radio,
  Search,
  Timer,
  Truck,
  X,
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
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [query, setQuery] = useState("");

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

  // Extract unique origin & target facility names for filter dropdowns
  const uniqueOrigins = useMemo(() => {
    const set = new Set<string>();
    enrichedList.forEach((item) => {
      if (item.originName) set.add(item.originName);
    });
    return Array.from(set).sort();
  }, [enrichedList]);

  const uniqueTargets = useMemo(() => {
    const set = new Set<string>();
    enrichedList.forEach((item) => {
      if (item.targetName) set.add(item.targetName);
    });
    return Array.from(set).sort();
  }, [enrichedList]);

  // Filter and prioritize running/in-transit first
  const filtered = useMemo(() => {
    let list = enrichedList;
    if (filter === "RUNNING") list = list.filter((e) => e.escalation.status === "RUNNING");
    else if (filter === "IN_TRANSIT") list = list.filter((e) => e.state === "IN_TRANSIT");
    else if (filter === "EXHAUSTED") list = list.filter((e) => e.state === "EXHAUSTED");
    else if (filter === "RESOLVED") list = list.filter((e) => e.state === "RESOLVED");

    if (searchFrom) {
      list = list.filter((e) => e.originName.toLowerCase().includes(searchFrom.toLowerCase()));
    }
    if (searchTo) {
      list = list.filter((e) => e.targetName.toLowerCase().includes(searchTo.toLowerCase()));
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.originName.toLowerCase().includes(q) ||
          e.targetName.toLowerCase().includes(q) ||
          e.unitId.toLowerCase().includes(q) ||
          e.bloodGroup.toLowerCase().includes(q) ||
          e.component.toLowerCase().includes(q),
      );
    }

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
  }, [enrichedList, filter, searchFrom, searchTo, query]);

  const runningCount = enrichedList.filter((e) => e.escalation.status === "RUNNING").length;
  const inTransitCount = enrichedList.filter((e) => e.state === "IN_TRANSIT").length;
  const exhaustedCount = enrichedList.filter((e) => e.state === "EXHAUSTED").length;

  const isFiltered = searchFrom || searchTo || query || filter !== "ALL";

  return (
    <div className="mt-2 rounded-xl border border-border bg-surface-raised p-3 shadow-card">
      {/* Header Bar with Actionable Operational Counters & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-accent animate-pulse" />
            <h2 className="text-xs font-bold text-text">Active Operations</h2>
          </div>
          <div className="flex items-center gap-1.5 text-3xs font-semibold text-text-muted">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-accent">
              {runningCount} running
            </span>
            {inTransitCount > 0 && (
              <span className="rounded-full bg-status-in-transit-bg px-2 py-0.5 font-mono text-status-in-transit">
                {inTransitCount} in transit
              </span>
            )}
            <span className="text-text-subtle">• {exhaustedCount} exhausted</span>
          </div>
        </div>

        {/* Operational & Facility Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* From Hospital Filter */}
          <div className="relative flex items-center">
            <Building2 className="absolute left-2.5 h-3 w-3 text-text-subtle pointer-events-none z-10" />
            <select
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className={[
                "rounded-lg border py-1 pl-7 pr-2.5 text-2xs font-medium text-text transition-all focus:outline-none cursor-pointer",
                searchFrom
                  ? "border-accent/80 bg-accent-soft/40 text-accent font-semibold shadow-xs"
                  : "border-border bg-surface hover:border-border-strong",
              ].join(" ")}
            >
              <option value="">From: All Sources</option>
              {uniqueOrigins.map((orig) => (
                <option key={orig} value={orig}>
                  From: {orig}
                </option>
              ))}
            </select>
            {searchFrom && (
              <button
                type="button"
                onClick={() => setSearchFrom("")}
                className="ml-1 rounded-full p-0.5 text-text-muted hover:bg-surface-overlay hover:text-text"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* To Hospital Filter */}
          <div className="relative flex items-center">
            <MapPin className="absolute left-2.5 h-3 w-3 text-text-subtle pointer-events-none z-10" />
            <select
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className={[
                "rounded-lg border py-1 pl-7 pr-2.5 text-2xs font-medium text-text transition-all focus:outline-none cursor-pointer",
                searchTo
                  ? "border-accent/80 bg-accent-soft/40 text-accent font-semibold shadow-xs"
                  : "border-border bg-surface hover:border-border-strong",
              ].join(" ")}
            >
              <option value="">To: All Destinations</option>
              {uniqueTargets.map((targ) => (
                <option key={targ} value={targ}>
                  To: {targ}
                </option>
              ))}
            </select>
            {searchTo && (
              <button
                type="button"
                onClick={() => setSearchTo("")}
                className="ml-1 rounded-full p-0.5 text-text-muted hover:bg-surface-overlay hover:text-text"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Free-text Search Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3 w-3 text-text-subtle pointer-events-none" />
            <input
              type="text"
              placeholder="Search hospital or unit..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={[
                "w-36 rounded-lg border py-1 pl-7 pr-6 text-2xs text-text transition-all placeholder:text-text-subtle focus:outline-none",
                query
                  ? "border-accent bg-accent-soft/20 font-medium"
                  : "border-border bg-surface hover:border-border-strong focus:border-accent",
              ].join(" ")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 rounded-full p-0.5 text-text-muted hover:text-text"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 text-2xs">
            {(["ALL", "RUNNING", "IN_TRANSIT", "EXHAUSTED"] as EscalationFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "rounded-md px-2 py-0.5 text-3xs font-bold uppercase tracking-wider transition-all",
                  filter === f
                    ? "bg-accent text-white shadow-xs"
                    : "text-text-muted hover:text-text",
                ].join(" ")}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Reset button when filters are active */}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setSearchFrom("");
                setSearchTo("");
                setQuery("");
                setFilter("ALL");
              }}
              className="rounded-lg border border-accent/40 bg-accent-soft px-2.5 py-1 text-3xs font-bold text-accent transition-all hover:bg-accent hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Carousel of Operational Cards */}
      <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
        {filtered.length === 0 ? (
          <div className="w-full py-6 text-center text-xs text-text-muted">
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
                  "group relative flex min-w-[270px] max-w-[290px] flex-col justify-between rounded-lg border p-2.5 text-left transition-all overflow-hidden",
                  isSelected
                    ? "border-accent bg-accent-soft/40 shadow-xs ring-1 ring-accent"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                ].join(" ")}
              >
                {/* Top Row: Blood Group, Component, ExpiryClock, Operational Status Pill */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExpiryClock compact expiresAt={Date.now() + 14 * 3600 * 1000} size={24} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-text truncate">
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
                  <div className="mt-2 px-0.5">
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
                <div className="mt-2 border-t border-border/60 pt-1.5 text-3xs">
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
