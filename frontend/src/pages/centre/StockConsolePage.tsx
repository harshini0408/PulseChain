/**
 * /centre/stock — Blood Centre Stock Console.
 *
 * Clean, production-grade layout:
 *  1. PageHeader with Live Connection dot
 *  2. StatCard Alert Strip (In alert window, Rescue in progress, Claimed today, Lost this week)
 *  3. ExpiryRiskOverview (risk bands, clean non-overlapping timeline, immediate attention queue)
 *  4. Quick Risk & Component Filter Bar
 *  5. Full StockTable
 *  6. CSV Bulk Import panel (Block 4 optional)
 */

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Radio,
  Upload,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
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
import { api } from "../../api/client";
import { StockTable } from "../../components/stock/StockTable";
import { ExpiryRiskOverview, classifyUnitRisk } from "../../components/stock/ExpiryRiskOverview";
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
const PAGE_SIZE = 20;

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

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

// ── CSV Import types ──────────────────────────────────────────────────────
interface CsvRow {
  component: string;
  bloodGroup: string;
  volumeMl: string;
  valueInr: string;
  collectedAt: string;
  expiresAt: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // Skip header row, parse data
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        component: parts[0] ?? "",
        bloodGroup: parts[1] ?? "",
        volumeMl: parts[2] ?? "",
        valueInr: parts[3] ?? "",
        collectedAt: parts[4] ?? "",
        expiresAt: parts[5] ?? "",
      };
    });
}

export function StockConsolePage() {
  const { facilityId } = useAuth();
  const [params, setParams] = useSearchParams();

  const stock = useStockQuery(facilityId);
  const { data: escalations } = useEscalationsQuery();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);

  const importMutation = useMutation({
    mutationFn: () =>
      api.logUnitBatch(
        csvRows.map((r) => ({
          component: r.component,
          bloodGroup: r.bloodGroup,
          volumeMl: Number(r.volumeMl),
          valueInr: Number(r.valueInr),
          collectedAt: r.collectedAt,
          expiresAt: r.expiresAt,
        }))
      ),
    onSuccess: (data) => {
      setImportResult({ imported: data.imported, total: data.total });
      setCsvRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["stock", facilityId] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setCsvRows(parseCsv(text));
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const units = useMemo(() => stock.data ?? [], [stock.data]);

  const view = (params.get("view") as View | null) ?? null;
  const component = params.get("component") as Component | null;
  const group = params.get("group") as BloodGroup | null;
  const rawStatus = params.get("status") as UnitStatus | null;
  const activeStatus: UnitStatus =
    rawStatus && UNIT_STATUSES.includes(rawStatus) ? rawStatus : "AVAILABLE";

  const rawPage = parseInt(params.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page"); // Reset pagination whenever filters change
    setParams(next, { replace: true });
  };

  const handleStatusChange = (newStatus: UnitStatus) => {
    const next = new URLSearchParams(params);
    next.set("status", newStatus);
    next.delete("page");
    // Clear conflicting view filters
    if (view === "rescue" && newStatus !== "RESCUE_PENDING") next.delete("view");
    if (view === "claimed" && newStatus !== "CLAIMED") next.delete("view");
    if (view === "lost" && newStatus !== "LOST") next.delete("view");
    setParams(next, { replace: true });
  };

  const toggleView = (v: View) => {
    const next = new URLSearchParams(params);
    if (view === v) {
      next.delete("view");
    } else {
      next.set("view", v);
      // Synchronize status tab with view
      if (v === "rescue") next.set("status", "RESCUE_PENDING");
      else if (v === "claimed") next.set("status", "CLAIMED");
      else if (v === "lost") next.set("status", "LOST");
      else if (v === "alert" && activeStatus === "LOST") next.set("status", "AVAILABLE");
    }
    next.delete("page");
    setParams(next, { replace: true });
  };

  const goToPage = (newPage: number) => {
    const next = new URLSearchParams(params);
    if (newPage <= 1) next.delete("page");
    else next.set(keyOrPage("page"), String(newPage));
    setParams(next, { replace: true });
    tableContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function keyOrPage(k: string) {
    return k;
  }

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

  // Status tab badge counts (filtered by component and group if selected)
  const statusCounts = useMemo(() => {
    const res: Record<UnitStatus, number> = {
      AVAILABLE: 0,
      RESCUE_PENDING: 0,
      CLAIMED: 0,
      IN_TRANSIT: 0,
      RECEIVED: 0,
      LOST: 0,
    };
    for (const u of units) {
      if (component && u.component !== component) continue;
      if (group && u.bloodGroup !== group) continue;
      if (res[u.status] !== undefined) {
        res[u.status]++;
      }
    }
    return res;
  }, [units, component, group]);

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

        if (component && u.component !== component) return false;
        if (group && u.bloodGroup !== group) return false;
        if (u.status !== activeStatus) return false;

        return true;
      }),
    [units, view, component, group, activeStatus],
  );

  // Expiry sorted units
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
      ),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, currentPage]);

  const hasFilter = Boolean(
    view || component || group || activeStatus !== "AVAILABLE"
  );
  const plateletClock = componentClock("PLATELETS");

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    next.set("status", "AVAILABLE");
    setParams(next, { replace: true });
  };

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

      {/* ── 1. Stat cards alert strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VIEWS.map((v, i) => {
          const meta = VIEW_META[v];
          const isUrgent = (v === "alert" || v === "rescue") && meta.value > 0;
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
              urgent={isUrgent}
              delay={i * 0.07}
            />
          );
        })}
      </div>

      {/* ── 2. Expiry Risk Overview (Non-overlapping horizon & attention queue) ── */}
      {!stock.isLoading && !stock.isError && units.length > 0 && (
        <ExpiryRiskOverview units={units} />
      )}

      {/* ── 3. Status Tabs (Replacing Status Dropdown) ────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface-raised p-1.5 shadow-sm">
        {UNIT_STATUSES.map((s) => {
          const isActive = activeStatus === s;
          const count = statusCounts[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              className={[
                "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "text-text shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface-overlay/50",
              ].join(" ")}
            >
              {isActive && (
                <motion.span
                  layoutId="stock-status-tab-pill"
                  className="absolute inset-0 rounded-lg bg-surface-overlay border border-border"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span
                className={[
                  "relative z-10 h-2 w-2 rounded-full",
                  UNIT_STATUS[s].dot,
                ].join(" ")}
              />
              <span className="relative z-10">{UNIT_STATUS[s].label}</span>
              <span
                className={[
                  "relative z-10 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-3xs font-bold tabular-nums",
                  isActive
                    ? "bg-accent text-white font-bold"
                    : "bg-surface-sunken text-text-muted",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Secondary Filter bar (Component, Group, Clear) ──── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-sm">

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

        {hasFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-text-muted">
          {filtered.length > PAGE_SIZE ? (
            <>
              Showing{" "}
              <span className="font-semibold text-text">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="font-semibold text-text">{filtered.length}</span> units
            </>
          ) : (
            <>
              {pluralise(filtered.length, "unit")}
              {hasFilter && units.length !== filtered.length ? ` of ${units.length}` : ""}
            </>
          )}
        </span>
      </div>

      {/* ── 5. Full Table & Pagination ───────────────────────────────────────── */}
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
          title={hasFilter ? "Nothing matches these filters" : `No ${UNIT_STATUS[activeStatus].label.toLowerCase()} units`}
          message={
            hasFilter
              ? "No unit in this facility's stock matches the current selection. Try changing the filters or status tab."
              : `All platelet stock is outside its ${plateletClock.thresholdHours}-hour clock. Units appear here as they cross into their component's alert window.`
          }
        />
      ) : (
        <div ref={tableContainerRef} className="space-y-3">
          <StockTable units={paginatedUnits} escalations={escalations} />

          {/* Pagination Controls — Rendered below the list when count exceeds 20 */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-sm">
              <p className="text-xs text-text-muted">
                Showing{" "}
                <span className="font-semibold text-text">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of <span className="font-semibold text-text">{filtered.length}</span> units
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-text-muted">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(Number(p))}
                        className={[
                          "h-7 min-w-7 rounded-lg px-2 text-xs font-semibold transition-colors",
                          currentPage === p
                            ? "bg-accent text-white shadow-sm"
                            : "border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-overlay",
                        ].join(" ")}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Bulk Stock Import (CSV) ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">Bulk stock import</p>
            <p className="text-xs text-text-muted">Upload a CSV to log multiple units at once (max 20)</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowImport((v) => !v);
              setCsvRows([]);
              setImportResult(null);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong"
          >
            <Upload className="h-3.5 w-3.5" />
            {showImport ? "Cancel" : "Import CSV"}
          </button>
        </div>

        {showImport && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-text-muted">
              CSV columns (header row required):{" "}
              <code className="rounded bg-surface px-1 font-mono text-xs text-text">
                component, bloodGroup, volumeMl, valueInr, collectedAt, expiresAt
              </code>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="block text-xs text-text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1 file:text-xs file:font-medium file:text-text hover:file:border-border-strong"
              onChange={handleFileChange}
              id="csv-import-file"
            />

            {csvRows.length > 0 && (
              <>
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-raised text-left">
                      <tr>
                        {["#", "Component", "Blood Group", "Volume (mL)", "Value (₹)", "Collected", "Expires"].map(
                          (h) => (
                            <th key={h} className="px-3 py-2 font-semibold text-text-muted">
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="bg-surface">
                          <td className="px-3 py-1.5 text-text-muted">{i + 1}</td>
                          <td className="px-3 py-1.5">{row.component}</td>
                          <td className="px-3 py-1.5">{row.bloodGroup}</td>
                          <td className="px-3 py-1.5">{row.volumeMl}</td>
                          <td className="px-3 py-1.5">{row.valueInr}</td>
                          <td className="px-3 py-1.5">{row.collectedAt}</td>
                          <td className="px-3 py-1.5">{row.expiresAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending}
                    className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                  >
                    {importMutation.isPending ? "Importing…" : `Import ${Math.min(csvRows.length, 20)} units`}
                  </button>
                  {importMutation.isError && (
                    <span className="text-xs text-status-lost">
                      Import failed — {importMutation.error instanceof Error ? importMutation.error.message : "Unknown error"}
                    </span>
                  )}
                </div>
              </>
            )}

            {importResult && (
              <div className="flex items-center gap-2 rounded-lg border border-status-received-bg bg-status-received-bg px-3 py-2 text-xs font-medium text-status-received">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {importResult.imported} of {importResult.total} units imported successfully
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
