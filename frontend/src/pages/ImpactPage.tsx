/**
 * /impact — what the network has actually done.
 *
 * The hero band is Tier A brand styling; everything below it is console tier.
 * Every number comes from GET /dashboard or GET /escalations/active. Nothing
 * on this page is hardcoded, including the sentence in the hero.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, CheckCircle, ChevronRight, IndianRupee, Radio, TrendingDown, TrendingUp, Users } from "lucide-react";
import {
  useDashboardQuery,
  useEscalationsQuery,
  useFacilityLookup,
  usePoolsQuery,
  useRequisitionsQuery,
} from "../api/hooks";
import { useAuth } from "../auth/AuthProvider";
import { haversineKm } from "../lib/geo";
import { StatTile } from "../components/dashboard/StatTile";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SavedLostBar } from "../components/dashboard/SavedLostBar";
import { FacilityDetailDrawer } from "../components/dashboard/FacilityDetailDrawer";
import { Badge, Card, ErrorState, LoadingState, PageHeader } from "../components/ui";
import { ConnectionDot } from "../components/layout/ConnectionDot";
import { formatInr, formatInrCompact, formatNumber, pluralise } from "../lib/format";
import type { Facility } from "@pulsechain/shared";

export function ImpactPage() {
  const { facilityId, role } = useAuth();
  const dashboard = useDashboardQuery();
  const { data: escalations } = useEscalationsQuery();
  const { facilities, byId } = useFacilityLookup();
  const { data: pools } = usePoolsQuery();
  // Requisitions: only hospitals have their own list; coordinators see open ones
  const { data: requisitions } = useRequisitionsQuery(
    role === "HOSPITAL" ? facilityId : null,
  );

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const originFacility = facilityId ? byId.get(facilityId) ?? null : null;

  const totals = dashboard.data?.totals;
  const history = dashboard.data?.history ?? [];
  const activeRescues = (escalations ?? []).filter((e) => e.status === "RUNNING").length;

  // ── Block 5: live-computed rates from existing endpoints ──────────────────
  // Mobilisation stats — each DonorPool carries lastMobilisedAt + lastMobilisationStatus
  const poolsContacted = (pools ?? []).filter((p) => p.lastMobilisedAt != null).length;
  const poolsAcknowledged = (pools ?? []).filter(
    (p) => p.lastMobilisationStatus === "ACKNOWLEDGED",
  ).length;
  const mobilisationResponseRatePct =
    poolsContacted > 0
      ? Math.round((poolsAcknowledged / poolsContacted) * 1000) / 10
      : null;

  // Requisition stats — from the current hospital's own list (available without re-deploy)
  const reqList = requisitions ?? [];
  const reqFilled = reqList.filter(
    (r) => r.status === "FILLED" || r.status === "DONOR_TIER",
  ).length;
  const reqPartial = reqList.filter((r) => r.status === "PARTIAL").length;
  const reqOpen = reqList.filter((r) => r.status === "OPEN").length;
  const reqTotal = reqList.length;
  const fulfilmentRatePct =
    reqTotal > 0 ? Math.round((reqFilled / reqTotal) * 1000) / 10 : null;

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
          {/* ── Hero band, Tier A ───────────────────────────────────────── */}
          <section className="brand-field rounded-3xl border border-border px-6 py-6 sm:px-8 sm:py-8">
            <p className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Since the network came online
            </p>

            <h2 className="max-w-3xl font-display text-2xl font-bold text-text sm:text-display-sm">
              {formatNumber(totals?.unitsSaved ?? 0)} units reached a patient instead of a bin
            </h2>

            {/* Live rescue pulse indicator */}
            {activeRescues > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-surface-raised/80 px-3 py-1.5 text-xs font-medium text-accent backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-accent" />
                </span>
                {activeRescues === 1
                  ? "1 rescue running now"
                  : `${activeRescues} rescues running now`}
              </motion.div>
            )}

            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
              That is {formatInr(totals?.valueSavedInr ?? 0)} of product kept in the system, and{" "}
              {pluralise(activeRescues, "rescue")} running right now across{" "}
              {pluralise(facilities.length, "facility", "facilities")}.
            </p>
          </section>

          {/* ── Headline figures ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Units saved"
              value={formatNumber(totals?.unitsSaved ?? 0)}
              animateValue={totals?.unitsSaved ?? 0}
              caption="Claimed and received in time"
              tone="saved"
              icon={<TrendingUp className="h-4 w-4" />}
              delay={0}
            />
            <StatTile
              label="Units lost"
              value={formatNumber(totals?.unitsLost ?? 0)}
              animateValue={totals?.unitsLost ?? 0}
              caption="Expired before anyone claimed"
              tone="lost"
              icon={<TrendingDown className="h-4 w-4" />}
              delay={0.07}
            />
            <StatTile
              label="Value saved"
              value={formatInrCompact(totals?.valueSavedInr ?? 0)}
              caption={formatInr(totals?.valueSavedInr ?? 0)}
              icon={<IndianRupee className="h-4 w-4" />}
              delay={0.14}
            />
            <StatTile
              label="Active rescues"
              value={formatNumber(activeRescues)}
              animateValue={activeRescues}
              caption="Escalating right now"
              tone={activeRescues > 0 ? "saved" : "neutral"}
              icon={<Radio className="h-4 w-4" />}
              delay={0.21}
            />
          </div>

          {/* ── Block 5: Requisition & Mobilisation rates ────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Requisitions filled"
              value={fulfilmentRatePct !== null ? `${fulfilmentRatePct}%` : "—"}
              progressPct={fulfilmentRatePct}
              caption={
                reqTotal > 0
                  ? `${reqFilled} of ${reqTotal} requests`
                  : "No requisitions yet"
              }
              tone={fulfilmentRatePct !== null && fulfilmentRatePct >= 50 ? "saved" : "neutral"}
              icon={<CheckCircle className="h-4 w-4" />}
              delay={0.05}
            />
            <StatTile
              label="Partially filled"
              value={formatNumber(reqPartial)}
              animateValue={reqPartial}
              caption={reqPartial > 0 ? "Units received, not complete" : "None yet"}
              tone="neutral"
              icon={<TrendingUp className="h-4 w-4" />}
              delay={0.12}
            />
            <StatTile
              label="Mobilisation response"
              value={mobilisationResponseRatePct !== null ? `${mobilisationResponseRatePct}%` : "—"}
              progressPct={mobilisationResponseRatePct}
              caption={
                poolsContacted > 0
                  ? `${poolsAcknowledged} of ${poolsContacted} pools responded`
                  : "No mobilisations sent yet"
              }
              tone={
                mobilisationResponseRatePct !== null && mobilisationResponseRatePct >= 40
                  ? "saved"
                  : "neutral"
              }
              icon={<Users className="h-4 w-4" />}
              delay={0.19}
            />
            <StatTile
              label="Still open"
              value={formatNumber(reqOpen)}
              animateValue={reqOpen}
              caption={reqOpen > 0 ? "Requests awaiting supply" : "All requests resolved"}
              tone={reqOpen > 0 ? "lost" : "neutral"}
              icon={<Radio className="h-4 w-4" />}
              delay={0.26}
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
                          "group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                          isSelected
                            ? "border-accent bg-accent-soft/50 ring-1 ring-accent"
                            : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text group-hover:text-accent">
                            {facility.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-subtle">
                            <span>{facility.city}</span>
                            {distanceKm !== null && (
                              <>
                                <span>•</span>
                                <span className="tabular-nums">
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

                        <ChevronRight className="h-3.5 w-3.5 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
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
