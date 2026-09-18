/**
 * /impact — what the network has actually done.
 *
 * The hero band is Tier A brand styling; everything below it is console tier.
 * Every number comes from GET /dashboard or GET /escalations/active. Nothing
 * on this page is hardcoded, including the sentence in the hero.
 */

import { Activity, IndianRupee, Radio, TrendingDown, TrendingUp } from "lucide-react";
import {
  useDashboardQuery,
  useEscalationsQuery,
  useFacilityLookup,
} from "../api/hooks";
import { StatTile } from "../components/dashboard/StatTile";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SavedLostBar } from "../components/dashboard/SavedLostBar";
import { Badge, Card, ErrorState, LoadingState, PageHeader } from "../components/ui";
import { ConnectionDot } from "../components/layout/ConnectionDot";
import { formatInr, formatInrCompact, formatNumber, pluralise } from "../lib/format";

export function ImpactPage() {
  const dashboard = useDashboardQuery();
  const { data: escalations } = useEscalationsQuery();
  const { facilities } = useFacilityLookup();

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
          {/* ── Hero band, Tier A ───────────────────────────────────────── */}
          <section className="brand-field rounded-3xl border border-border px-6 py-10 sm:px-10 sm:py-14">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5 py-1.5 text-xs font-medium text-text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Since the network came online
            </p>

            <h2 className="max-w-3xl font-display text-display-md font-bold text-text sm:text-display-lg">
              {formatNumber(totals?.unitsSaved ?? 0)} units reached a patient instead of a bin
            </h2>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-text-muted">
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

              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {facilities.map((facility) => (
                  <li
                    key={facility.facilityId}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">{facility.name}</p>
                      <p className="text-2xs text-text-subtle">{facility.city}</p>
                    </div>
                    <Badge variant={facility.type === "BLOOD_CENTRE" ? "accent" : "outline"}>
                      {facility.type === "BLOOD_CENTRE" ? "Centre" : "Hospital"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
