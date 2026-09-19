/**
 * /impact — what the network has actually done.
 *
 * New composition:
 *  1. IMPACT SCENE      — full first viewport; enormous "365" hero-number,
 *                         NetworkOrb as center visual, editorial narrative
 *  2. SPLIT NARRATIVE   — 365 SAVED / 39 LOST with flowing line between
 *  3. VALUE STRIP       — ₹5.47L value preserved
 *  4. TREND CHART       — scroll-triggered, below fold
 *  5. FACILITY NETWORK  — same list + drawer
 *
 * Every number comes from real API data. Nothing hardcoded.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, ChevronRight, IndianRupee, Radio, TrendingDown, TrendingUp } from "lucide-react";
import {
  useDashboardQuery,
  useEscalationsQuery,
  useFacilityLookup,
} from "../api/hooks";
import { useAuth } from "../auth/AuthProvider";
import { haversineKm } from "../lib/geo";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SavedLostBar } from "../components/dashboard/SavedLostBar";
import { FacilityDetailDrawer } from "../components/dashboard/FacilityDetailDrawer";
import { Badge, ErrorState, LoadingState } from "../components/ui";
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

  // Scroll trigger for chart section
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, margin: "-100px" });

  return (
    <div>
      {dashboard.isLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <LoadingState variant="stats" label="Gathering network outcomes…" />
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
        <div className="space-y-16">

          {/* ── 1. IMPACT SCENE ───────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl brand-field border border-border/60 shadow-sm"
            style={{ minHeight: "480px" }}
          >
            {/* Subtle radial glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--accent) / 0.08) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-10 px-8 py-14 sm:px-12 sm:py-16">

              {/* Left: the number IS the story */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg">
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-raised/80 px-3.5 py-1.5 text-xs font-medium text-text-muted backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Since the network came online
                </motion.p>

                {/* Hero number */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.05, 0.7, 0.1, 1] }}
                  className="hero-number text-accent leading-none"
                >
                  <ImpactCounter value={totals?.unitsSaved ?? 0} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <p className="font-display text-2xl sm:text-3xl font-bold text-text mt-3 tracking-tight">
                    UNITS RESCUED
                  </p>
                  <p className="mt-3 text-sm text-text-muted max-w-md leading-relaxed">
                    Reached patients instead of expiring.{" "}
                    <span className="font-semibold text-text">{formatInr(totals?.valueSavedInr ?? 0)}</span>{" "}
                    of viable blood retained in the clinical system
                    {activeRescues > 0 && (
                      <>, with{" "}
                        <span className="font-semibold text-accent">
                          {pluralise(activeRescues, "rescue")}
                        </span>{" "}
                        running right now
                      </>
                    )}.
                  </p>
                </motion.div>

                {/* Live badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 flex items-center gap-2"
                >
                  <ConnectionDot />
                  <span className="text-xs text-text-muted">
                    {pluralise(facilities.length, "facility", "facilities")} connected
                  </span>
                </motion.div>
              </div>

              {/* Right: NetworkOrb — the visual center */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.05, 0.7, 0.1, 1], delay: 0.15 }}
                className="flex-shrink-0"
              >
                <NetworkOrb size={260} className="opacity-95" />
              </motion.div>
            </div>
          </section>

          {/* ── 2. SPLIT NARRATIVE ────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-center"
          >
            {/* Saved */}
            <div className="flex flex-col items-center lg:items-end gap-2 text-center lg:text-right">
              <span className="text-2xs font-bold uppercase tracking-widest text-status-received">
                Saved
              </span>
              <p className="font-display text-[clamp(3rem,8vw,6rem)] font-black text-status-received leading-none tabular-nums">
                <ImpactCounter value={totals?.unitsSaved ?? 0} />
              </p>
              <span className="text-sm text-text-muted">units reached patients</span>
              {dashboard.data?.today && (
                <span className="text-xs font-semibold text-status-received">
                  +{dashboard.data.today.unitsSaved} today
                </span>
              )}
            </div>

            {/* Flow connector */}
            <div className="hidden lg:flex flex-col items-center gap-3">
              <div className="h-24 w-px bg-gradient-to-b from-status-received via-border to-status-lost" />
              <span className="text-2xs text-text-subtle font-mono">vs</span>
              <div className="h-24 w-px bg-gradient-to-b from-border via-status-lost/50 to-transparent" />
            </div>

            {/* Lost */}
            <div className="flex flex-col items-center lg:items-start gap-2 text-center lg:text-left">
              <span className="text-2xs font-bold uppercase tracking-widest text-status-lost">
                Lost
              </span>
              <p className="font-display text-[clamp(3rem,8vw,6rem)] font-black text-status-lost/70 leading-none tabular-nums">
                <ImpactCounter value={totals?.unitsLost ?? 0} />
              </p>
              <span className="text-sm text-text-muted">expired before anyone claimed</span>
              {dashboard.data?.today && (
                <span className="text-xs font-semibold text-status-lost">
                  +{dashboard.data.today.unitsLost} today
                </span>
              )}
            </div>
          </motion.section>

          {/* ── 3. VALUE STRIP ────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl brand-field border border-border/60 p-6 sm:p-8 text-center"
          >
            <p className="text-2xs font-bold uppercase tracking-widest text-text-subtle mb-2">
              Value preserved in the clinical system
            </p>
            <p className="font-display text-[clamp(2.5rem,7vw,5rem)] font-black text-text leading-none">
              {formatInrCompact(totals?.valueSavedInr ?? 0)}
            </p>
            <p className="text-sm text-text-muted mt-2">
              {formatInr(totals?.valueSavedInr ?? 0)} in blood components that reached patients
            </p>

            {/* Saved vs lost mini bar */}
            <div className="mt-6 max-w-sm mx-auto">
              <SavedLostBar
                unitsSaved={totals?.unitsSaved ?? 0}
                unitsLost={totals?.unitsLost ?? 0}
              />
            </div>
          </motion.section>

          {/* ── 4. TREND CHART ────────────────────────────────────────────────── */}
          <motion.section
            ref={chartRef}
            initial={{ opacity: 0, y: 24 }}
            animate={chartInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-text">Saved and lost over time</h2>
              <span className="text-xs text-text-muted">
                {history.length > 0 ? pluralise(history.length, "day") : "No history yet"}
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface-raised p-5">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
                  No daily history yet. The trend appears after the first full day.
                </p>
              ) : (
                <TrendChart history={history} />
              )}
            </div>
          </motion.section>

          {/* ── 5. FACILITY NETWORK ───────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-text-muted" />
              <h2 className="text-sm font-bold text-text">The network</h2>
              <span className="ml-auto text-xs text-text-muted">{facilities.length} facilities</span>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                                <span>·</span>
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
          </motion.section>

          {/* Facility drawer */}
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
