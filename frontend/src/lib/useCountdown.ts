/**
 * frontend/src/lib/useCountdown.ts
 *
 * Ticks once a second, independently of the 3.5s query poll, so a countdown
 * never appears to stall between refetches.
 */

import { useEffect, useState } from "react";
import { calculateRemaining, type CountdownState } from "./countdown";

export function useCountdown(targetIso: string | undefined): CountdownState {
  const [state, setState] = useState<CountdownState>(() => calculateRemaining(targetIso));

  useEffect(() => {
    setState(calculateRemaining(targetIso));
    if (!targetIso) return;

    const timer = window.setInterval(() => {
      setState(calculateRemaining(targetIso));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetIso]);

  return state;
}

/** A once-a-second `Date.now()`, for components driving several countdowns. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export type { CountdownState };
