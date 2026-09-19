/**
 * /centre/stock — Blood Centre Stock Console.
 *
 * Clean, production-grade layout:
 *  1. PageHeader with Live Connection dot
 *  2. StatCard Alert Strip (In alert window, Rescue in progress, Claimed today, Lost this week)
 *  3. ExpiryRiskOverview (risk bands, clean non-overlapping timeline, immediate attention queue)
 *  4. Quick Risk & Component Filter Bar
 *  5. Full StockTable
 */

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Radio,
  XCircle,
} from "lucide-react";
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
import { ExpiryRiskOverview, type RiskLevel, classifyUnitRisk } from "../../components/stock/ExpiryRiskOverview";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { COMPONENT, UNIT_STATUS, componentClock } from "../../lib/status";
import { pluralise } from "../../lib/format";

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

  const toggleView = (v: View) => {
    setParam("view", view === v ? null : v);
  };

  // Stat card counts
  const counts = useMemo(() => {
    let alert = 0;
    let rescue = 0;
    let claimedToday = 0;
    let lostThisWeek = 0;

    for (const u of units) {
      if (u.status === "RESCUE_PENDING") rescue++;
      if (classifyUnitRisk(u) === "critical" || classifyUnitRisk(u) === "urgent") alert++;
      if (u.status === "CLAIMED" && isToday(u.claimedAt)) claimedToday++;
      if (u.status === "LOST" && isWithinLastWeek(u.lostAt ?? u.expiresAt)) {
        lostThisWeek++;
      }
    }

    return { alert, rescue, claimedToday, lostThisWeek };
  }, [units]);

  // Filtered table units
  const filtered = useMemo(
    () =>
      units.filter((u) => {
        if (view === "alert" && classifyUnitRisk(u) === "safe") return false;
        if (view === "rescue" && u.status !== "RESCUE_PENDING") return false;
        if (view === "claimed" && (u.status !== "CLAIMED" || !isToday(u.claimedAt))) return false;
        if (
          view === "lost" &&
          (u.status !== "LOST" || !isWithinLastWeek(u.lostAt ?? u.expiresAt))
        )
          return false;

        if (risk && classifyUnitRisk(u) !== risk) return false;
        if (component && u.component !== component) return false;
        if (group && u.bloodGroup !== group) return false;
        if (status && u.status !== status) return false;

        return true;
      }),
    [units, view, risk, component, group, status],
  );

  const hasFilter = Boolean(view || risk || component || group || status);
  const plateletClock = componentClock("PLATELETS");

  const VIEW_META: Record<
    View,
    {
      label: string;
      value: number;
      caption: string;
      icon: JSX.Element;
      tone: "neutral" | "accent" | "positive";
    }
  > = {
    alert: {
      label: "In alert window",
      value: counts.alert,
      caption: "Inside component threshold",
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: "accent",
    },
    rescue: {
      label: "Rescue in progress",
      value: counts.rescue,
      caption: "Escalating through rings",
      icon: <Radio className="h-4 w-4" />,
      tone: "accent",
    },
    claimed: {
      label: "Claimed today",
      value: counts.claimedToday,
      caption: "Taken by hospital",
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: "positive",
    },
    lost: {
      label: "Lost this week",
      value: counts.lostThisWeek,
      caption: "Expired without claim",
      icon: <XCircle className="h-4 w-4" />,
      tone: "neutral",
    },
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        eyebrow="Blood centre"
        title="Stock console"
        subtitle="Live inventory, ordered by time remaining"
        actions={<ConnectionDot />}
      />

      {/* ── 1. Stat cards alert strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {/* ── 2. Expiry Risk Overview (Non-overlapping horizon & attention queue) ── */}
      {!stock.isLoading && !stock.isError && units.length > 0 && (
        <ExpiryRiskOverview
          units={units}
          activeRiskFilter={risk}
          onSelectRiskFilter={(r) => setParam("risk", r)}
        />
      )}

      {/* ── 3. Filter bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
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

      {/* ── 4. Full Table ───────────────────────────────────────────────────── */}
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
