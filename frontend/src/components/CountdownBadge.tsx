import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownBadgeProps {
  expiresAt: string;
  size?: "sm" | "md" | "lg";
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({ expiresAt, size = "md" }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
        <AlertTriangle className="w-3.5 h-3.5" />
        EXPIRED
      </span>
    );
  }

  // Color coding based on hours remaining
  let colorStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-700/60";
  let isPulsing = false;

  if (timeLeft.hours < 24) {
    colorStyle = "bg-rose-950/90 text-rose-300 border-rose-600 glow-urgent";
    isPulsing = true;
  } else if (timeLeft.hours < 48) {
    colorStyle = "bg-amber-950/80 text-amber-300 border-amber-600/80";
  }

  const formatPad = (num: number) => num.toString().padStart(2, "0");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border transition-all ${colorStyle} ${
        isPulsing ? "ring-2 ring-rose-500/50" : ""
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isPulsing ? "animate-spin" : ""}`} />
      <span>
        {formatPad(timeLeft.hours)}h {formatPad(timeLeft.minutes)}m {formatPad(timeLeft.seconds)}s
      </span>
    </span>
  );
};
