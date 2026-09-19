/**
 * /impact — what the network has actually done.
 *
 * The hero band is Tier A brand styling; everything below it is console tier.
 * Every number comes from GET /dashboard or GET /escalations/active. Nothing
 * on this page is hardcoded, including the sentence in the hero.
 */

import { useState } from "react";
import { Activity, ChevronRight, IndianRupee, Radio, TrendingDown, TrendingUp } from "lucide-react";
import {
  useDashboardQuery,
  useEscalationsQuery,
  useFacilityLookup,
} from "../api/hooks";
import { useAuth } from "../auth/AuthProvider";
import { haversineKm } from "../lib/geo";
import { StatTile } from "../components/dashboard/StatTile";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SavedLostBar } from "../components/dashboard/SavedLostBar";
import { FacilityDetailDrawer } from "../components/dashboard/FacilityDetailDrawer";
import { Badge, Card, ErrorState, LoadingState, PageHeader } from "../components/ui";
import { ConnectionDot } from "../components/layout/ConnectionDot";
import { NetworkOrb } from "../components/visualizations/NetworkOrb";
import { ImpactCounter } from "../components/visualizations/ImpactCounter";
import { FlowLine } from "../components/motion/FlowLine";
import { formatInr, formatInrCompact, formatNumber, pluralise } from "../lib/format";
import type { Facility } from "@pulsechain/shared";

export function ImpactPage() {
  const { facilityId } = useAuth();
  const dashboard = useDashboardQuery();
  const { data: escalations } = useEscalationsQuery();
  const { facilities, byId } = useFacilityLookup();

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const originFacility = facilityId ? byId.get(facilityId) ?? null : null;

  const totals = dashboard.data?.totals;
  const history = dashboard.data?.history ?? [];
  const activeRescues = (escalations ?? []).filter((e) => e.status === "RUNNING").length;

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Impact"
        subtitle="Cumulative outcomes across the corridor"
        actions={<ConnectionDot />}
      />

      {dashboard.isLoading ? (
        <div className="space-y-6">
          <div className="skeleton h-40 w-full rounded-3xl" />
          <LoadingState variant="stats" label="Loading impact" />
        </div>
      ) : dashboard.isError ? (
        <ErrorState
          title="Impact did not load"
          message={
            dashboard.error instanceof Error
              ? dashboard.error.message
              : "The dashboard endpoint did not respond."
          }
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <div className="space-y-6">
          {/* ── Hero band, Tier A with NetworkOrb + ImpactCounter ─────────────────── */}
          <section className="brand-field rounded-3xl border border-border/80 p-6 sm:p-8 relative overflow-hidden shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-raised/90 px-3.5 py-1.5 text-xs font-medium text-text-muted shadow-sm backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Since the network came online
                </p>

                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-text tracking-tight">
                    <ImpactCounter value={totals?.unitsSaved ?? 0} className="text-accent" />
                    {" "}units rescued
                  </h2>
                </div>

                <p className="mt-1 font-display text-xl sm:text-2xl text-text-muted font-medium">
                  reached patients instead of expiring in disposal bins.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
                  That represents <span className="font-semibold text-text">{formatInr(totals?.valueSavedInr ?? 0)}</span> of viable blood components retained in the clinical system, with{" "}
                  <span className="font-semibold text-accent">{pluralise(activeRescues, "rescue")}</span> actively running right now across{" "}
                  {pluralise(facilities.length, "facility", "facilities")}.
                </p>
              </div>

              {/* Orbiting Network Visualization */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <NetworkOrb size={220} className="opacity-90" />
              </div>
            </div>
          </section>

          {/* ── Headline figures ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Units saved"
              value={formatNumber(totals?.unitsSaved ?? 0)}
              caption="Claimed and received in time"
              tone="saved"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatTile
              label="Units lost"
              value={formatNumber(totals?.unitsLost ?? 0)}
              caption="Expired before anyone claimed"
              tone="lost"
              icon={<TrendingDown className="h-4 w-4" />}
            />
            <StatTile
              label="Value saved"
              value={formatInrCompact(totals?.valueSavedInr ?? 0)}
              caption={formatInr(totals?.valueSavedInr ?? 0)}
              icon={<IndianRupee className="h-4 w-4" />}
            />
            <StatTile
              label="Active rescues"
              value={formatNumber(activeRescues)}
              caption="Escalating right now"
              tone={activeRescues > 0 ? "saved" : "neutral"}
              icon={<Radio className="h-4 w-4" />}
            />
          </div>

          {/* ── Trend ───────────────────────────────────────────────────── */}
          <Card>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-text">Saved and lost over time</h2>
              <span className="text-xs text-text-muted">
                {history.length > 0 ? pluralise(history.length, "day") : "No history yet"}
              </span>
            </div>

            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                No daily history has been recorded yet. The trend appears after the first full day.
              </p>
            ) : (
              <TrendChart history={history} />
            )}
          </Card>

          {/* ── Ratio + network ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
            <Card>
              <h2 className="mb-4 text-sm font-bold text-text">Saved against lost</h2>
              <SavedLostBar
                unitsSaved={totals?.unitsSaved ?? 0}
                unitsLost={totals?.unitsLost ?? 0}
              />

              {dashboard.data?.today && (
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                      Saved today
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-status-received" data-numeric="true">
                      {formatNumber(dashboard.data.today.unitsSaved)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                      Lost today
                    </dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-status-lost" data-numeric="true">
                      {formatNumber(dashboard.data.today.unitsLost)}
                    </dd>
                  </div>
                </dl>
              )}
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-text-muted" />
                <h2 className="text-sm font-bold text-text">The network</h2>
                <span className="ml-auto text-xs text-text-muted">{facilities.length}</span>
              </div>

              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {facilities.map((facility) => {
                  const isSelected = selectedFacility?.facilityId === facility.facilityId;
                  const distanceKm = originFacility
                    ? haversineKm(originFacility.lat, originFacility.lng, facility.lat, facility.lng)
                    : null;

                  return (
                    <li key={facility.facilityId}>
                      <button
                        type="button"
                        onClick={() => setSelectedFacility(facility)}
                        className={[
                          "group flex flex-col w-full gap-2 rounded-xl border p-3 text-left transition-all",
                          isSelected
                            ? "border-accent bg-accent-soft/50 ring-1 ring-accent"
                            : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-text group-hover:text-accent">
                              {facility.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-subtle">
                              <span>{facility.city}</span>
                              {distanceKm !== null && (
                                <>
                                  <span>•</span>
                                  <span className="tabular-nums font-medium">
                                    {facility.facilityId === originFacility?.facilityId
                                      ? "Here"
                                      : `${distanceKm.toFixed(1)} km`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <Badge variant={facility.type === "BLOOD_CENTRE" ? "accent" : "outline"}>
                            {facility.type === "BLOOD_CENTRE" ? "Centre" : "Hospital"}
                          </Badge>

                          <ChevronRight className="h-4 w-4 text-text-subtle transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                        </div>

                        {isSelected && originFacility && facility.facilityId !== originFacility.facilityId && (
                          <div className="pt-1 w-full border-t border-accent/20">
                            <FlowLine
                              state="active"
                              originLabel="Current Centre"
                              targetLabel={facility.name.split(" ").slice(0, 2).join(" ")}
                            />
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          {/* ── Facility Operational Profile Drawer ─────────────────────── */}
          <FacilityDetailDrawer
            facility={selectedFacility}
            originFacility={originFacility}
            onClose={() => setSelectedFacility(null)}
          />
        </div>
      )}
    </div>
  );
}
