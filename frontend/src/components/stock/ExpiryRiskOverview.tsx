/**
 * ExpiryRiskOverview.tsx
 *
 * Operational risk horizon overview placed between the high-level summary cards
 * and the full inventory table on the Blood Centre Stock Console.
 *
 * Categorizes inventory into Critical (0-6h / rescue), Urgent (within alert window),
 * and Safe (>alert threshold). Provides visual horizon distribution and direct click-through
 * to the unit detail page (/centre/units/:unitId).
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { StockUnit } from "../../api/client";
import { CRITICAL_DISPLAY_HOURS, isInAlertWindow } from "../../lib/status";
import { ExpiryCountdown } from "./ExpiryCountdown";
import { StatusPill } from "../ui/StatusPill";
import { ComponentClockBadge } from "./ComponentClockBadge";
import { ExpiryClock } from "../visualizations/ExpiryClock";

export type RiskLevel = "critical" | "urgent" | "safe";

export interface RiskCategorizedUnit {
  unit: StockUnit;
  level: RiskLevel;
  hoursRemaining: number;
}

export function classifyUnitRisk(u: StockUnit): RiskLevel {
  const hours = u.hoursRemaining;
  if (hours <= 0 || hours <= CRITICAL_DISPLAY_HOURS || u.status === "RESCUE_PENDING") {
    return "critical";
  }
  if (isInAlertWindow(u.component, hours)) {
    return "urgent";
  }
  return "safe";
}

interface ExpiryRiskOverviewProps {
  units: StockUnit[];
  activeRiskFilter: RiskLevel | null;
  onSelectRiskFilter: (risk: RiskLevel | null) => void;
}

export function ExpiryRiskOverview({
  units,
  activeRiskFilter,
  onSelectRiskFilter,
}: ExpiryRiskOverviewProps) {
  const navigate = useNavigate();

  const { critical, urgent, safe } = useMemo(() => {
    const crit: StockUnit[] = [];
    const urg: StockUnit[] = [];
    const sf: StockUnit[] = [];

    // Sort by expiresAt ascending first
    const sorted = [...units].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    );

    for (const u of sorted) {
      const level = classifyUnitRisk(u);
      if (level === "critical") crit.push(u);
      else if (level === "urgent") urg.push(u);
      else sf.push(u);
    }

    return { critical: crit, urgent: urg, safe: sf };
  }, [units]);

  const total = units.length;
  const criticalPct = total > 0 ? (critical.length / total) * 100 : 0;
  const urgentPct = total > 0 ? (urgent.length / total) * 100 : 0;
  const safePct = total > 0 ? (safe.length / total) * 100 : 0;

  // Units needing immediate attention (critical units first, then urgent units, top 4)
  const needsAttention = useMemo(() => {
    return [...critical, ...urgent].slice(0, 4);
  }, [critical, urgent]);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-card">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-text">Expiry risk overview</h2>
          <span className="hidden text-xs text-text-muted sm:inline">•</span>
          <p className="hidden text-xs text-text-muted sm:inline">
            See which blood components need attention before they become waste
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs text-text-subtle">
          <Clock className="h-3.5 w-3.5" />
          <span>Real-time horizon</span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Risk Bands Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Critical Box */}
          <button
            type="button"
            onClick={() => onSelectRiskFilter(activeRiskFilter === "critical" ? null : "critical")}
            className={[
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
              activeRiskFilter === "critical"
                ? "border-accent bg-accent-soft/70 ring-1 ring-accent"
                : "border-border bg-surface hover:border-accent/50 hover:bg-accent-soft/30",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-accent">
                <span className="relative flex h-2 w-2">
                  {critical.length > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Critical (0–6h / Rescue)
              </span>
              <span className="text-2xs font-medium text-text-muted group-hover:text-accent">
                {critical.length > 0 ? "Filter" : ""}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tabular-nums text-accent" data-numeric="true">
                {critical.length}
              </span>
              <span className="text-xs text-text-muted">units</span>
            </div>
            <p className="mt-1 text-2xs text-text-subtle">Immediate rescue attention required</p>
          </button>

          {/* Urgent Box */}
          <button
            type="button"
            onClick={() => onSelectRiskFilter(activeRiskFilter === "urgent" ? null : "urgent")}
            className={[
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
              activeRiskFilter === "urgent"
                ? "border-status-in-transit bg-status-in-transit-bg/70 ring-1 ring-status-in-transit"
                : "border-border bg-surface hover:border-status-in-transit/50 hover:bg-status-in-transit-bg/30",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-status-in-transit">
                <span className="h-2 w-2 rounded-full bg-status-in-transit" />
                Urgent (In Alert Window)
              </span>
              <span className="text-2xs font-medium text-text-muted group-hover:text-status-in-transit">
                {urgent.length > 0 ? "Filter" : ""}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-2xl font-bold tabular-nums text-status-in-transit"
                data-numeric="true"
              >
                {urgent.length}
              </span>
              <span className="text-xs text-text-muted">units</span>
            </div>
            <p className="mt-1 text-2xs text-text-subtle">Within component threshold</p>
          </button>

          {/* Safe Box */}
          <button
            type="button"
            onClick={() => onSelectRiskFilter(activeRiskFilter === "safe" ? null : "safe")}
            className={[
              "group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
              activeRiskFilter === "safe"
                ? "border-status-received bg-status-received-bg/70 ring-1 ring-status-received"
                : "border-border bg-surface hover:border-status-received/50 hover:bg-status-received-bg/30",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-status-received">
                <span className="h-2 w-2 rounded-full bg-status-received" />
                Safe (&gt; Alert Window)
              </span>
              <span className="text-2xs font-medium text-text-muted group-hover:text-status-received">
                {safe.length > 0 ? "Filter" : ""}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-2xl font-bold tabular-nums text-status-received"
                data-numeric="true"
              >
                {safe.length}
              </span>
              <span className="text-xs text-text-muted">units</span>
            </div>
            <p className="mt-1 text-2xs text-text-subtle">Stable shelf-life reserve</p>
          </button>
        </div>

        {/* Interactive Temporal Scatter Horizon */}
        {total > 0 && (
          <div className="mt-5 rounded-xl border border-border/70 bg-surface/60 p-3.5">
            <div className="flex items-center justify-between text-2xs text-text-subtle">
              <span className="font-semibold uppercase tracking-wider">Temporal Expiry Scatter (0–48h Horizon)</span>
              <span>{total} tracked units</span>
            </div>

            {/* Timeline Track with Unit Dots */}
            <div className="relative mt-4 mb-2 h-7 flex items-center">
              <div className="absolute inset-x-0 h-1.5 rounded-full bg-border" />
              {/* Critical zone highlight 0-6h (first 12.5% of 48h) */}
              <div className="absolute left-0 w-[12.5%] h-1.5 rounded-l-full bg-accent/40" />
              {/* Urgent zone highlight 6-16h */}
              <div className="absolute left-[12.5%] w-[20.8%] h-1.5 bg-status-in-transit/40" />

              {/* Unit scatter markers */}
              {units.slice(0, 30).map((u) => {
                const hrs = Math.max(0, u.hoursRemaining);
                const pct = Math.min(100, Math.max(2, (hrs / 48) * 100));
                const level = classifyUnitRisk(u);
                const dotColor =
                  level === "critical"
                    ? "bg-accent ring-2 ring-accent/30"
                    : level === "urgent"
                    ? "bg-status-in-transit ring-1 ring-status-in-transit/30"
                    : "bg-status-received";

                return (
                  <button
                    key={u.unitId}
                    type="button"
                    onClick={() => navigate(`/centre/units/${u.unitId}`)}
                    style={{ left: `${pct}%` }}
                    className={`absolute -translate-x-1/2 h-3.5 w-3.5 rounded-full ${dotColor} transition-transform hover:scale-150 hover:z-20 cursor-pointer ${
                      level === "critical" ? "motion-safe:animate-pulse" : ""
                    }`}
                    title={`${u.unitId} (${u.bloodGroup} ${u.component}): ${u.hoursRemaining}h left`}
                  />
                );
              })}
            </div>

            {/* Timeline Axis Labels */}
            <div className="flex items-center justify-between text-3xs font-mono text-text-subtle pt-1 border-t border-border/50">
              <span className="text-accent font-semibold">0h (Now)</span>
              <span className="text-accent">6h (Critical)</span>
              <span className="text-status-in-transit">12h</span>
              <span>24h (1 Day)</span>
              <span>36h</span>
              <span>48h (Platelet limit)</span>
            </div>
          </div>
        )}

        {/* Needs Attention Strip */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold text-text">Immediate Attention Queue</span>
              <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-2xs font-semibold text-text-muted">
                {critical.length + urgent.length} units
              </span>
            </div>
            {needsAttention.length > 0 && (
              <span className="text-2xs text-text-subtle">
                Click any unit to open full operational timeline
              </span>
            )}
          </div>

          {needsAttention.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-status-received/30 bg-status-received-bg/40 px-3.5 py-3 text-xs text-status-received font-medium">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>No units require immediate rescue action.</strong> All current inventory is
                safely outside active rescue windows.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {needsAttention.map((u) => {
                const isCrit = classifyUnitRisk(u) === "critical";
                return (
                  <button
                    key={u.unitId}
                    type="button"
                    onClick={() => navigate(`/centre/units/${u.unitId}`)}
                    className={[
                      "group flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all hover:shadow-sm",
                      isCrit
                        ? "border-accent/40 bg-accent-soft/30 hover:border-accent hover:bg-accent-soft/60"
                        : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={[
                              "h-2 w-2 rounded-full flex-shrink-0",
                              isCrit ? "bg-accent animate-pulse" : "bg-status-in-transit",
                            ].join(" ")}
                          />
                          <span className="font-mono text-xs font-semibold text-text truncate">
                            {u.unitId}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-display text-base font-bold text-text">
                            {u.bloodGroup}
                          </span>
                          <ComponentClockBadge component={u.component} size="sm" />
                        </div>
                      </div>

                      <ExpiryClock compact expiresAt={u.expiresAt} size={32} />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-2xs">
                      <StatusPill kind="unit" value={u.status} size="sm" />
                      <div className="flex items-center gap-1 text-text-subtle group-hover:text-accent font-medium">
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
