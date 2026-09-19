/**
 * CriticalUnitFloat.tsx
 *
 * Up to 4 critical units rendered as freeform floating cards
 * in a spatial composition — NOT a grid.
 *
 * Each card:
 *  - Blood group in large display type
 *  - Time countdown (e.g. 6h 12m)
 *  - Component label
 *  - Status badge
 *  - Click → /centre/units/:id
 *
 * Position offsets are pre-set for up to 4 units so the layout
 * feels editorial rather than computed. On mobile they stack.
 */

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { StockUnit } from "../../api/client";
import { useCountdown } from "../../lib/useCountdown";
import { COMPONENT } from "../../lib/status";
import { soundManager } from "../../lib/soundManager";
import type { Component } from "@pulsechain/shared";

interface CriticalCardProps {
  unit: StockUnit;
  index: number;
}

function CriticalCard({ unit, index }: CriticalCardProps) {
  const navigate = useNavigate();
  const countdown = useCountdown(unit.expiresAt);
  const comp = COMPONENT[unit.component as Component];

  return (
    <motion.button
      type="button"
      onClick={() => {
        soundManager.play("pulse");
        navigate(`/centre/units/${unit.unitId}`);
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex flex-col justify-between text-left rounded-xl border border-accent/25 bg-surface-raised/90 p-4 shadow-sm hover:border-accent hover:shadow-md hover:bg-surface-raised transition-all cursor-pointer backdrop-blur-sm"
      aria-label={`${unit.bloodGroup} ${unit.component}: ${countdown.label} remaining. Click to inspect.`}
    >
      {/* Top row: pulse indicator and rescue tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-2xs font-bold uppercase tracking-wider text-accent">
            {unit.status === "RESCUE_PENDING" ? "Rescue Pending" : "Critical Window"}
          </span>
        </span>
        <span className="text-2xs font-mono text-text-subtle group-hover:text-accent transition-colors">
          #{unit.unitId.slice(-6)}
        </span>
      </div>

      {/* Middle row: Blood group + component */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-accent leading-none">
            {unit.bloodGroup}
          </p>
          <p className="mt-1 text-xs font-medium text-text-muted">
            {comp?.label ?? unit.component}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-text-subtle font-semibold">Remaining</p>
          <p className="text-sm font-bold text-text tabular-nums">
            {countdown.isExpired ? "Expired" : countdown.label}
          </p>
        </div>
      </div>

      {/* Action cue */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-2xs text-text-muted group-hover:text-accent transition-colors">
        <span>Inspect rescue timeline</span>
        <span className="font-semibold transition-transform group-hover:translate-x-1">→</span>
      </div>
    </motion.button>
  );
}

interface CriticalUnitFloatProps {
  units: StockUnit[];
}

export function CriticalUnitFloat({ units }: CriticalUnitFloatProps) {
  const toShow = units.slice(0, 4);

  if (toShow.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {toShow.map((unit, i) => (
        <CriticalCard key={unit.unitId} unit={unit} index={i} />
      ))}
    </div>
  );
}
