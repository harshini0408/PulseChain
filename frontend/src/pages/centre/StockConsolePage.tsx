/**
 * /centre/stock — the blood centre's console.
 *
 * Three bands: an alert strip whose four counters double as filters, a filter
 * bar whose state lives in the URL so a refresh keeps the view, and the unit
 * table sorted by time remaining.
 *
 * Every counter is derived client-side from the one stock payload. There is no
 * second request for summary numbers, and no fifth counter.
 */

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Droplets, Radio, XCircle } from "lucide-react";
import {
  BLOOD_GROUPS,
  COMPONENTS,
  UNIT_STATUSES,
  type BloodGroup,
  type Component,
  type UnitStatus,
} from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useEscalationsQuery, useStockQuery } from "../../api/hooks";
import type { StockUnit } from "../../api/client";
import { StockTable } from "../../components/stock/StockTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { PulseLine } from "../../components/motion/PulseLine";
import { ImpactCounter } from "../../components/visualizations/ImpactCounter";
import { COMPONENT, UNIT_STATUS, componentClock, isInAlertWindow } from "../../lib/status";
import { pluralise } from "../../lib/format";

import {
  ExpiryRiskOverview,
  classifyUnitRisk,
  type RiskLevel,
} from "../../components/stock/ExpiryRiskOverview";

type View = "alert" | "rescue" | "claimed" | "lost";

const VIEWS: View[] = ["alert", "rescue", "claimed", "lost"];

const DAY_MS = 24 * 60 * 60 * 1000;

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isWithinLastWeek(iso: string | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && Date.now() - t <= 7 * DAY_MS;
}

export function StockConsolePage() {
  // facilityId is non-null here: RequireAuth has already redirected anyone
  // without a session, so there is no fallback facility to leak.
  const { facilityId } = useAuth();
  const [params, setParams] = useSearchParams();

  const stock = useStockQuery(facilityId);
  const { data: escalations } = useEscalationsQuery();

  const units = useMemo(() => stock.data ?? [], [stock.data]);

  const view = (params.get("view") as View | null) ?? null;
  const risk = (params.get("risk") as RiskLevel | null) ?? null;
  const component = params.get("component") as Component | null;
  const group = params.get("group") as BloodGroup | null;
  const status = params.get("status") as UnitStatus | null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const toggleView = (v: View) => setParam("view", view === v ? null : v);

  // --- Counters, all from the one payload -----------------------------------
  const counts = useMemo(() => {
    let alert = 0;
    let rescue = 0;
    let claimedToday = 0;
    let lostThisWeek = 0;

    for (const u of units) {
      if (u.status === "AVAILABLE" && isInAlertWindow(u.component, u.hoursRemaining)) alert++;
      if (u.status === "RESCUE_PENDING") rescue++;
      if (u.status !== "LOST" && isToday(u.claimedAt)) claimedToday++;
      if (u.status === "LOST" && isWithinLastWeek(u.lostAt)) lostThisWeek++;
    }

    return { alert, rescue, claimedToday, lostThisWeek };
  }, [units]);

  // --- Filters --------------------------------------------------------------
  const matchesView = (u: StockUnit): boolean => {
    switch (view) {
      case "alert":
        return u.status === "AVAILABLE" && isInAlertWindow(u.component, u.hoursRemaining);
      case "rescue":
        return u.status === "RESCUE_PENDING";
      case "claimed":
        return u.status !== "LOST" && isToday(u.claimedAt);
      case "lost":
        return u.status === "LOST" && isWithinLastWeek(u.lostAt);
      default:
        return true;
    }
  };

  const matchesRisk = (u: StockUnit): boolean => {
    if (!risk) return true;
    return classifyUnitRisk(u) === risk;
  };

  const filtered = useMemo(
    () =>
      units.filter(
        (u) =>
          matchesView(u) &&
          matchesRisk(u) &&
          (!component || u.component === component) &&
          (!group || u.bloodGroup === group) &&
          (!status || u.status === status),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, view, risk, component, group, status],
  );

  const hasFilter = Boolean(view || risk || component || group || status);
  const plateletClock = componentClock("PLATELETS");

  const VIEW_META: Record<View, { label: string; value: number; caption: string; icon: JSX.Element; tone: "neutral" | "accent" | "positive" }> = {
    alert: {
      label: "In alert window",
      value: counts.alert,
      caption: "Inside the component threshold",
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: "accent",
    },
    rescue: {
      label: "Rescue in progress",
      value: counts.rescue,
      caption: "Escalating through the rings",
      icon: <Radio className="h-4 w-4" />,
      tone: "accent",
    },
    claimed: {
      label: "Claimed today",
      value: counts.claimedToday,
      caption: "Taken by a hospital",
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: "positive",
    },
    lost: {
      label: "Lost this week",
      value: counts.lostThisWeek,
      caption: "Expired before anyone claimed",
      icon: <XCircle className="h-4 w-4" />,
      tone: "neutral",
    },
  };

  return (
    <div>
      {/* ── Asymmetric Hero Section ────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-text-subtle">
              Blood Centre Console
            </span>
            <span className="text-text-subtle text-xs">•</span>
            <ConnectionDot />
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text tracking-tight">
              Vigilance.
            </h1>
            <span className="text-sm font-medium text-text-muted">Live stock inventory</span>
          </div>

          <p className="mt-2 text-sm text-text-muted max-w-lg">
            Component shelf-life monitored in real time across the Coimbatore corridor. Prioritized by time remaining until expiry.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-36 hidden sm:block opacity-60">
            <PulseLine height={20} color="hsl(var(--accent))" />
          </div>

          <div className="rounded-2xl glass-surface px-5 py-3 border border-border/70 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                Action Window
              </span>
              <div className="flex items-baseline gap-1 text-accent font-bold">
                <ImpactCounter value={counts.alert + counts.rescue} className="text-2xl" />
                <span className="text-xs font-normal text-text-muted">units at risk</span>
              </div>
            </div>
            {counts.rescue > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
            )}
          </div>
        </div>
      </div>

      {/* ── Alert strip ───────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VIEWS.map((v) => {
          const meta = VIEW_META[v];
          return (
            <StatCard
              key={v}
              label={meta.label}
              value={String(meta.value)}
              caption={meta.caption}
              icon={meta.icon}
              tone={meta.tone}
              active={view === v}
              onClick={() => toggleView(v)}
            />
          );
        })}
      </div>

        {/* ── Expiry risk overview ───────────────────────────────────────── */}
        <ExpiryRiskOverview
          units={units}
          activeRiskFilter={risk}
          onSelectRiskFilter={(r) => setParam("risk", r)}
        />

        {/* ── Filter bar ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-card">
          {/* Quick Risk Filters */}
          <div className="mr-2 flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setParam("risk", null)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                !risk ? "bg-surface-raised font-bold text-text shadow-sm" : "text-text-muted hover:text-text",
              ].join(" ")}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setParam("risk", risk === "critical" ? null : "critical")}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                risk === "critical"
                  ? "bg-accent-soft font-bold text-accent shadow-sm"
                  : "text-text-muted hover:text-accent",
              ].join(" ")}
            >
              Critical
            </button>
            <button
              type="button"
              onClick={() => setParam("risk", risk === "urgent" ? null : "urgent")}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                risk === "urgent"
                  ? "bg-status-in-transit-bg font-bold text-status-in-transit shadow-sm"
                  : "text-text-muted hover:text-status-in-transit",
              ].join(" ")}
            >
              Urgent
            </button>
            <button
              type="button"
              onClick={() => setParam("risk", risk === "safe" ? null : "safe")}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                risk === "safe"
                  ? "bg-status-received-bg font-bold text-status-received shadow-sm"
                  : "text-text-muted hover:text-status-received",
              ].join(" ")}
            >
              Safe
            </button>
          </div>

          <select
            aria-label="Filter by component"
            value={component ?? ""}
            onChange={(e) => setParam("component", e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong"
          >
            <option value="">All components</option>
            {COMPONENTS.map((c) => (
              <option key={c} value={c}>
                {COMPONENT[c].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by blood group"
            value={group ?? ""}
            onChange={(e) => setParam("group", e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong"
          >
            <option value="">All groups</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={status ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong"
          >
            <option value="">All statuses</option>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {UNIT_STATUS[s].label}
              </option>
            ))}
          </select>

          {hasFilter && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-text-muted">
            {pluralise(filtered.length, "unit")}
            {hasFilter && units.length !== filtered.length ? ` of ${units.length}` : ""}
          </span>
        </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {stock.isLoading ? (
        <LoadingState variant="table" rows={6} label="Loading stock" />
      ) : stock.isError ? (
        <ErrorState
          title="Stock did not load"
          message={
            stock.error instanceof Error
              ? stock.error.message
              : "The stock endpoint did not respond."
          }
          onRetry={() => void stock.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Droplets className="h-6 w-6" />}
          title={hasFilter ? "Nothing matches these filters" : "No units in the alert window"}
          message={
            hasFilter
              ? "No unit in this facility's stock matches the current selection. Clear the filters to see everything held here."
              : `All platelet stock is outside its ${plateletClock.thresholdHours}-hour clock. Units appear here as they cross into their component's alert window.`
          }
        />
      ) : (
        <StockTable units={filtered} escalations={escalations} />
      )}
    </div>
  );
}
