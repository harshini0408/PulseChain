/**
 * Units saved against units lost, over time.
 *
 * Both series are the same measure in the same unit, so they share one y axis.
 * A second scale would invent a relationship that is not in the data.
 *
 * Colour is not the only thing telling the two apart: saved is a solid line,
 * lost is dashed, both are in the legend, both are labelled at their last
 * point, and the same numbers are one button away as a table. The palette was
 * validated for colour-vision separation (see styles/index.css), and this
 * secondary encoding is what makes it safe regardless.
 */

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyStatsRecord } from "../../api/client";
import { formatDate } from "../../lib/format";

interface TrendChartProps {
  history: DailyStatsRecord[];
}

const SAVED = "hsl(var(--status-received))";
const LOST = "hsl(var(--status-lost))";
const AXIS = "hsl(var(--text-subtle))";
const GRID = "hsl(var(--border))";

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-raised">
      <p className="text-2xs font-semibold text-text-muted">{formatDate(String(label))}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: item.color }}
              aria-hidden="true"
            />
            <span className="text-text-muted">{item.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-text">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({ history }: TrendChartProps) {
  const [showTable, setShowTable] = useState(false);

  // A line needs two points. With one day of history, show the dot rather than
  // an empty plot, and say so.
  const sparse = history.length < 2;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* Identity is never colour alone: the legend is always present. */}
        <ul className="flex items-center gap-4">
          <li className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="18" y2="4" stroke={SAVED} strokeWidth="2" />
            </svg>
            Units saved
          </li>
          <li className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg width="18" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="18"
                y2="4"
                stroke={LOST}
                strokeWidth="2"
                strokeDasharray="5 3"
              />
            </svg>
            Units lost
          </li>
        </ul>

        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="rounded-lg px-2 py-1 text-2xs font-semibold text-text-muted transition-colors hover:bg-surface-overlay hover:text-text"
        >
          {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-sunken">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold text-text-muted">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-text-muted">Saved</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold text-text-muted">Lost</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.date} className="border-t border-border">
                  <td className="px-3 py-1.5 text-text">{formatDate(row.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-text">{row.unitsSaved}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-text">{row.unitsLost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={history} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value)}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: GRID, strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="unitsSaved"
                  name="Units saved"
                  stroke={SAVED}
                  strokeWidth={2}
                  dot={sparse ? { r: 4, fill: SAVED } : false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--surface-raised))" }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="unitsLost"
                  name="Units lost"
                  stroke={LOST}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={sparse ? { r: 4, fill: LOST } : false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--surface-raised))" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {sparse && (
            <p className="mt-2 text-2xs text-text-subtle">
              Only one day of history so far, shown as points. The line appears from the second day.
            </p>
          )}
        </>
      )}
    </div>
  );
}
