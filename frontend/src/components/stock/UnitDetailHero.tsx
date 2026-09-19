import React from "react";
import { StockUnit } from "../../api/client";
import { ExpiryClock } from "../visualizations/ExpiryClock";
import { StatusPill } from "../ui/StatusPill";
import { ComponentClockBadge } from "./ComponentClockBadge";
import { BloodGroupToken } from "../ui/BloodGroupToken";
import { componentClock } from "../../lib/status";
import { formatDateTime, formatNumber } from "../../lib/format";
import { FlowLine } from "../motion/FlowLine";

interface UnitDetailHeroProps {
  unit: StockUnit;
  facilityName: string;
}

export const UnitDetailHero: React.FC<UnitDetailHeroProps> = ({ unit, facilityName }) => {
  const clock = componentClock(unit.component);

  // Map unit status to flowline state
  const flowState =
    unit.status === "RECEIVED"
      ? "completed"
      : unit.status === "LOST"
      ? "failed"
      : unit.status === "RESCUE_PENDING" || unit.status === "IN_TRANSIT"
      ? "active"
      : unit.status === "CLAIMED"
      ? "searching"
      : "inactive";

  return (
    <div className="mb-6 rounded-3xl glass-surface p-6 sm:p-8 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Blood Identity & Token */}
        <div className="flex items-start sm:items-center gap-5">
          <BloodGroupToken
            bloodGroup={unit.bloodGroup}
            component={unit.component}
            size="lg"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-text-subtle">
                {unit.unitId}
              </span>
              <span className="text-text-subtle text-xs">•</span>
              <span className="text-xs text-text-muted font-medium">{facilityName}</span>
            </div>

            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-text tracking-tight">
              {unit.bloodGroup} {clock.label}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ComponentClockBadge component={unit.component} withClock />
              <StatusPill kind="unit" value={unit.status} withDot />
            </div>
          </div>
        </div>

        {/* Right: Dominant Expiry Clock */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-2xl bg-surface/80 p-4 border border-border/70 backdrop-blur-sm">
          <ExpiryClock
            expiresAt={unit.expiresAt}
            totalDurationHours={clock.thresholdHours}
            size={80}
          />
        </div>
      </div>

      {/* Quick Spec Strip */}
      <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-text-subtle font-medium">Volume</span>
          <p className="mt-0.5 font-semibold text-text font-mono text-sm">
            {formatNumber(unit.volumeMl)} ml
          </p>
        </div>
        <div>
          <span className="text-text-subtle font-medium">Collected</span>
          <p className="mt-0.5 font-semibold text-text">{formatDateTime(unit.collectedAt)}</p>
        </div>
        <div>
          <span className="text-text-subtle font-medium">Target Expiry</span>
          <p className="mt-0.5 font-semibold text-text">{formatDateTime(unit.expiresAt)}</p>
        </div>
        <div>
          <span className="text-text-subtle font-medium">Rescue Status</span>
          <div className="mt-1">
            <FlowLine
              state={flowState}
              originLabel="Collected"
              targetLabel={unit.status === "RECEIVED" ? "Received" : "Viability"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
