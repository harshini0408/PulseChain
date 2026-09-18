/**
 * frontend/src/lib/countdown.ts
 *
 * Client-side countdown hook that updates every 1000ms.
 * Independent of server polling cycles so counters remain active and ticking.
 */

import { useState, useEffect } from "react";

export interface CountdownState {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string; // e.g. "05:42" or "2h 15m 30s"
}

export function calculateRemaining(targetIsoString?: string): CountdownState {
  if (!targetIsoString) {
    return {
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: "00:00",
    };
  }

  const targetMs = new Date(targetIsoString).getTime();
  const nowMs = Date.now();
  const diffMs = targetMs - nowMs;

  if (diffMs <= 0) {
    return {
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: "00:00",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted = "";
  if (hours > 0) {
    formatted = `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  } else {
    formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return {
    totalSeconds,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formatted,
  };
}

export function useCountdown(targetIsoString?: string): CountdownState {
  const [state, setState] = useState<CountdownState>(() =>
    calculateRemaining(targetIsoString),
  );

  useEffect(() => {
    setState(calculateRemaining(targetIsoString));

    const timer = setInterval(() => {
      setState(calculateRemaining(targetIsoString));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetIsoString]);

  return state;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatDistanceKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export const formatDistance = formatDistanceKm;

export function formatHoursMinutes(hours: number): string {
  if (hours <= 0) return "0h 00m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

