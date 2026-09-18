/**
 * frontend/src/components/dashboard/SavedLostBar.tsx
 *
 * Stacked bar chart: daily units saved vs units lost.
 * Last 14 days of history.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyStatsRecord } from "../../api/client";
import { format, parseISO } from "date-fns";

interface SavedLostBarProps {
  history: DailyStatsRecord[];
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM");
  } catch {
    return dateStr;
  }
}

export function SavedLostBar({ history }: SavedLostBarProps) {
  const data = history
    .slice(-14)
    .map((day) => ({
      date: formatDate(day.date),
      saved: day.unitsSaved,
      lost: day.unitsLost,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Bar dataKey="saved" name="Saved" fill="#16a34a" radius={[3, 3, 0, 0]} opacity={0.85} />
        <Bar dataKey="lost"  name="Lost"  fill="#dc2626" radius={[3, 3, 0, 0]} opacity={0.7} />
      </BarChart>
    </ResponsiveContainer>
  );
}
