/**
 * frontend/src/pages/ImpactPage.tsx
 *
 * Impact Dashboard — live metrics from the PulseChain network.
 *
 * Four panels:
 *   1. Counter tiles — animated totals (unitsSaved, unitsLost, valueSaved, loss rate)
 *   2. Time-series trend — 30-day saved/lost + loss-rate line with WHO reference band
 *   3. Daily bar chart — 14-day saved vs lost
 *   4. Today's live counters
 */

import { useEffect, useRef, useState } from "react";
import { BarChart2, TrendingUp, Activity, Zap } from "lucide-react";
import { PageHeader, Card, Spinner, ErrorState } from "../components/ui";
import { TrendChart } from "../components/dashboard/TrendChart";
import { SavedLostBar } from "../components/dashboard/SavedLostBar";
import { useDashboardQuery } from "../api/hooks";

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------
function useAnimatedCount(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const from = prevTarget.current;
    prevTarget.current = target;
    startRef.current = null;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * ease));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Counter tile with animation
// ---------------------------------------------------------------------------
interface CounterTileProps {
  label: string;
  value: number;
  unit?: string;
  formatter?: (v: number) => string;
  accent?: boolean;
  icon?: React.ReactNode;
  delta?: string;
}

function CounterTile({ label, value, unit, formatter, accent = false, icon, delta }: CounterTileProps) {
  const animated = useAnimatedCount(value);
  const display = formatter ? formatter(animated) : animated.toLocaleString("en-IN");

  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5 flex flex-col gap-3">
      {icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-platelet-bg" : "bg-surface-overlay"}`}>
          <span className={accent ? "text-platelet" : "text-text-muted"}>{icon}</span>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={["text-3xl font-bold tabular-nums", accent ? "text-platelet" : "text-text"].join(" ")}
          data-numeric="true"
        >
          {display}
        </span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {delta && <p className="text-xs text-text-muted">{delta}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function ImpactPage() {
  const { data, isLoading, isError, refetch, error } = useDashboardQuery();

  const totals = data?.totals ?? { unitsSaved: 0, unitsLost: 0, valueSavedInr: 0, valueLostInr: 0 };
  const today = data?.today ?? { unitsSaved: 0, unitsLost: 0, valueSavedInr: 0, valueLostInr: 0 };
  const history = data?.history ?? [];

  const totalUnits = totals.unitsSaved + totals.unitsLost;
  const lossRatePct = totalUnits > 0
    ? Math.round((totals.unitsLost / totalUnits) * 1000) / 10
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Network Impact"
        subtitle="Cumulative outcomes across the PulseChain rescue network · refreshes every 10s"
        actions={
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-text-muted">Live</span>
          </div>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <ErrorState
          message={error?.message ?? "Failed to load dashboard metrics."}
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <>
          {/* ── Counter tiles ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <CounterTile
              label="Units Saved"
              value={totals.unitsSaved}
              unit="units"
              icon={<Zap className="h-4 w-4" />}
            />
            <CounterTile
              label="Units Lost"
              value={totals.unitsLost}
              unit="units"
              accent
              icon={<Activity className="h-4 w-4" />}
            />
            <CounterTile
              label="Value Rescued"
              value={totals.valueSavedInr}
              unit="INR"
              formatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <CounterTile
              label="Loss Rate"
              value={lossRatePct}
              unit="%"
              formatter={(v) => `${v.toFixed(1)}`}
              accent={lossRatePct > 13}
              delta="WHO target: <11%"
              icon={<BarChart2 className="h-4 w-4" />}
            />
          </div>

          {/* ── Time-series trend ── */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-text-muted" />
              <h2 className="text-sm font-semibold text-text">30-Day Trend</h2>
              <span className="ml-auto text-xs text-text-muted">
                Saved / Lost · Loss rate vs WHO 11–13% band
              </span>
            </div>
            {history.length > 0 ? (
              <TrendChart history={history} />
            ) : (
              <p className="text-sm text-text-muted py-8 text-center">No historical data yet.</p>
            )}
          </Card>

          {/* ── Saved vs Lost bar + Today panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-text">Daily Breakdown</h2>
                <span className="ml-auto text-xs text-text-muted">Last 14 days</span>
              </div>
              {history.length > 0 ? (
                <SavedLostBar history={history} />
              ) : (
                <p className="text-sm text-text-muted py-8 text-center">No data yet.</p>
              )}
            </Card>

            {/* Today's live counters */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-text-muted" />
                <h2 className="text-sm font-semibold text-text">Today</h2>
                <span className="ml-auto text-[10px] text-green-600 font-medium bg-green-50 rounded-full px-2 py-0.5 border border-green-200">
                  Live
                </span>
              </div>
              <dl className="space-y-3">
                {[
                  { label: "Units Saved",    value: today.unitsSaved,    colour: "text-green-600" },
                  { label: "Units Lost",     value: today.unitsLost,     colour: "text-red-600" },
                  { label: "Value Saved",    value: today.valueSavedInr, colour: "text-green-600",
                    fmt: (v: number) => `₹${v.toLocaleString("en-IN")}` },
                  { label: "Value Lost",     value: today.valueLostInr,  colour: "text-red-600",
                    fmt: (v: number) => `₹${v.toLocaleString("en-IN")}` },
                ].map(({ label, value, colour, fmt }) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-xs text-text-muted">{label}</dt>
                    <dd className={`text-sm font-semibold tabular-nums ${colour}`}>
                      {fmt ? fmt(value) : value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-text-muted leading-relaxed">
                  WHO platelet wastage reference: 11–13% of collected units.
                  PulseChain aims to keep the network-wide loss rate below this band.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
