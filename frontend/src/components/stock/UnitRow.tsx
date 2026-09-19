/**
 * One unit, as a table row on desktop and a card below `md`.
 *
 * The AVAILABLE -> RESCUE_PENDING transition is one of exactly three places
 * this application spends motion: the row flashes its component colour once
 * and keeps an animated left edge for as long as the rescue is live. This is
 * the row the camera is on during the demo, and it has to be impossible to
 * miss on a poll cycle.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { StockUnit, ActiveEscalation } from "../../api/client";
import { StatusPill } from "../ui/StatusPill";
import { ComponentClockBadge } from "./ComponentClockBadge";
import { ExpiryCountdown } from "./ExpiryCountdown";
import { useCountdown } from "../../lib/useCountdown";
import { usePrefersReducedMotion } from "../../lib/motion";
import { ringAdvanceAt } from "../../lib/escalation";
import { ringToken } from "../../lib/status";
import { formatNumber } from "../../lib/format";
import { ExpiryClock } from "../visualizations/ExpiryClock";
import { CRITICAL_DISPLAY_HOURS } from "../../lib/status";

interface UnitRowProps {
  unit: StockUnit;
  escalation?: ActiveEscalation;
  variant?: "row" | "card";
}

/** How long the arrival flash stays up. Purely presentational. */
const FLASH_MS = 2600;

/** True once the unit has entered a live rescue. */
function isRescuing(status: string): boolean {
  return status === "RESCUE_PENDING";
}

function RescueCell({ escalation }: { escalation?: ActiveEscalation }) {
  const advanceAt = escalation
    ? ringAdvanceAt(escalation.startedAt, escalation.currentRing)
    : undefined;
  const countdown = useCountdown(advanceAt);

  if (!escalation) return <span className="text-xs text-text-subtle">—</span>;

  const ring = ringToken(escalation.currentRing);

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={["inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold", ring.pill].join(" ")}
      >
        <span className={["h-1.5 w-1.5 rounded-full", ring.dot].join(" ")} />
        {ring.label}
      </span>
      <span className="text-2xs tabular-nums text-text-muted" data-numeric="true">
        {countdown.isExpired ? "advancing" : `${countdown.label} to next ring`}
      </span>
    </span>
  );
}

export function UnitRow({ unit, escalation, variant = "row" }: UnitRowProps) {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const [flash, setFlash] = useState(false);
  const previousStatus = useRef(unit.status);

  // Fire only on the transition into RESCUE_PENDING, never on first paint —
  // otherwise every row flashes when the page loads.
  useEffect(() => {
    const wasRescuing = isRescuing(previousStatus.current);
    const nowRescuing = isRescuing(unit.status);
    previousStatus.current = unit.status;

    if (!wasRescuing && nowRescuing) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), FLASH_MS);
      return () => window.clearTimeout(timer);
    }
  }, [unit.status]);

  const rescuing = isRescuing(unit.status);
  const isCritical = rescuing || unit.hoursRemaining <= CRITICAL_DISPLAY_HOURS;
  const open = () => navigate(`/centre/units/${unit.unitId}`);

  // Under reduced motion the state change swaps instantly instead of animating.
  const flashAnimation =
    flash && !reducedMotion
      ? { backgroundColor: ["hsl(var(--platelet-bg))", "hsl(var(--surface-raised))"] }
      : {};

  if (variant === "card") {
    return (
      <motion.button
        type="button"
        onClick={open}
        animate={flashAnimation}
        transition={{ duration: FLASH_MS / 1000, ease: "easeOut" }}
        className={[
          "relative w-full overflow-hidden rounded-xl border text-left shadow-card transition-colors",
          isCritical ? "border-accent/40 bg-accent-soft/20 p-4" : "border-border bg-surface-raised p-4",
        ].join(" ")}
      >
        {isCritical && (
          <span
            className={[
              "absolute inset-y-0 left-0 w-1.5 bg-accent",
              rescuing && !reducedMotion ? "animate-rescue-edge" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        )}

        <div className="flex items-start justify-between gap-3 pl-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ExpiryClock compact expiresAt={unit.expiresAt} size={26} />
              <p className="truncate font-mono text-xs font-semibold text-text">{unit.unitId}</p>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-text">{unit.bloodGroup}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ComponentClockBadge component={unit.component} />
              <StatusPill kind="unit" value={unit.status} size="sm" withDot />
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-2xs uppercase tracking-widest text-text-subtle">Expires in</p>
            <ExpiryCountdown
              expiresAt={unit.expiresAt}
              component={unit.component}
              size="md"
              className="mt-0.5 block"
            />
          </div>
        </div>

        {rescuing && (
          <div className="mt-3 border-t border-border pt-3 pl-2">
            <RescueCell escalation={escalation} />
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <motion.tr
      onClick={open}
      animate={flashAnimation}
      transition={{ duration: FLASH_MS / 1000, ease: "easeOut" }}
      tabIndex={0}
      role="link"
      aria-label={`Unit ${unit.unitId}, ${unit.bloodGroup} ${unit.component}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={[
        "group cursor-pointer border-b border-border transition-colors last:border-0",
        isCritical
          ? "bg-accent-soft/20 hover:bg-accent-soft/40"
          : "hover:bg-surface-sunken",
      ].join(" ")}
    >
      <td className="relative py-3 pl-4 pr-3">
        {isCritical && (
          <span
            className={[
              "absolute inset-y-0 left-0 w-1 bg-accent",
              rescuing && !reducedMotion ? "animate-rescue-edge" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        )}
        <div className="flex items-center gap-2">
          <ExpiryClock compact expiresAt={unit.expiresAt} size={24} />
          <span className="font-mono text-xs font-semibold text-text">{unit.unitId}</span>
        </div>
        <span className="mt-0.5 ml-8 block text-2xs text-text-subtle">
          {formatNumber(unit.volumeMl)} ml
        </span>
      </td>

      <td className="px-3 py-3">
        <ComponentClockBadge component={unit.component} />
      </td>

      <td className="px-3 py-3">
        <span className="font-display text-base font-bold text-text">{unit.bloodGroup}</span>
      </td>

      <td className="px-3 py-3">
        <ExpiryCountdown expiresAt={unit.expiresAt} component={unit.component} />
      </td>

      <td className="px-3 py-3">
        <StatusPill kind="unit" value={unit.status} size="sm" withDot />
      </td>

      <td className="px-3 py-3">{rescuing ? <RescueCell escalation={escalation} /> : <span className="text-xs text-text-subtle">—</span>}</td>

      <td className="py-3 pl-3 pr-4 text-right">
        <ChevronRight className="inline-block h-4 w-4 text-text-subtle transition-colors group-hover:text-accent" />
      </td>
    </motion.tr>
  );
}
