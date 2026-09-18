import React from "react";
import { useCountdown } from "../../lib/countdown";
import { Timer, AlertOctagon } from "lucide-react";

interface CountdownRingProps {
  claimBy: string;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({ claimBy }) => {
  const countdown = useCountdown(claimBy);

  if (countdown.isExpired) {
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        <AlertOctagon className="w-3.5 h-3.5" />
        <span>Window closed</span>
      </div>
    );
  }

  // Under 60 seconds is critical
  const isUrgent = countdown.totalSeconds < 120;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-tight border ${
        isUrgent
          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900 animate-pulse"
          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
      }`}
    >
      <Timer className={`w-3.5 h-3.5 ${isUrgent ? "text-rose-500" : "text-blue-500"}`} />
      <span>Window: {countdown.formatted}</span>
    </div>
  );
};
