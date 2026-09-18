/**
 * frontend/src/components/dashboard/TrendChart.tsx
 *
 * Dual-line time-series chart: units saved vs units lost.
 * Includes the 11–13% WHO wastage reference band on loss rate.
 */

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DailyStatsRecord } from "../../api/client";
import { format, parseISO } from "date-fns";

interface TrendChartProps {
  history: DailyStatsRecord[];
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM");
  } catch {
    return dateStr;
  }
}

// Loss rate (%) = unitsLost / (unitsSaved + unitsLost) * 100
function lossRate(day: DailyStatsRecord): number | null {
  const total = day.unitsSaved + day.unitsLost;
  if (total === 0) return null;
  return Math.round((day.unitsLost / total) * 1000) / 10; // 1 decimal
}

export function TrendChart({ history }: TrendChartProps) {
  const data = history
    .slice(-30) // last 30 days
    .map((day) => ({
      date: formatDate(day.date),
      saved: day.unitsSaved,
      lost: day.unitsLost,
      lossRate: lossRate(day),
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 5)}
        />
        <YAxis
          yAxisId="count"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={32}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 30]}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        />
        <Legend
          iconSize={10}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />

        {/* WHO reference band: 11–13% loss rate */}
        <ReferenceLine
          yAxisId="rate"
          y={11}
          stroke="#fbbf24"
          strokeDasharray="4 3"
          strokeWidth={1}
          label={{ value: "11% WHO", fontSize: 9, fill: "#f59e0b", position: "left" }}
        />
        <ReferenceLine
          yAxisId="rate"
          y={13}
          stroke="#f87171"
          strokeDasharray="4 3"
          strokeWidth={1}
          label={{ value: "13% WHO", fontSize: 9, fill: "#ef4444", position: "left" }}
        />

        {/* Saved area */}
        <Area
          yAxisId="count"
          type="monotone"
          dataKey="saved"
          name="Saved"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#savedGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        {/* Lost line */}
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="lost"
          name="Lost"
          stroke="#dc2626"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {/* Loss rate line */}
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="lossRate"
          name="Loss %"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
