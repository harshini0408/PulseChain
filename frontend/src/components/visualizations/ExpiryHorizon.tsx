/**
 * ExpiryHorizon.tsx
 *
 * The flagship Blood Centre visualization — replaces generic stat cards + bar chart.
 *
 * Custom SVG scene (no Recharts):
 *   X-axis: NOW → 48h (real time remaining)
 *   Y-axis: grouped by component — PLATELETS (top), RBC (middle), PLASMA (bottom)
 *   Each unit = one dot at its hoursRemaining position
 *   Critical (0–6h): crimson, larger, breathing animation
 *   Urgent  (6–16h): gold
 *   Safe    (>16h):  green
 *
 * Clicking a dot navigates to /centre/units/:id
 * Hovering shows a floating label
 */

import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { StockUnit } from "../../api/client";
import { COMPONENT, componentClock, isInAlertWindow } from "../../lib/status";
import type { Component } from "@pulsechain/shared";

const HORIZON_HOURS = 48;
const GROUPS: Component[] = ["PLATELETS", "RBC", "PLASMA"];
const ROW_HEIGHT = 64;
const LABEL_W = 84;
const AXIS_H = 32;
const PAD_R = 24;
const DOT_CRITICAL = 7;
const DOT_URGENT = 5.5;
const DOT_SAFE = 4;

type RiskLevel = "critical" | "urgent" | "safe";

function classifyRisk(u: StockUnit): RiskLevel {
  const h = u.hoursRemaining;
  if (h <= 0 || h <= 6 || u.status === "RESCUE_PENDING") return "critical";
  if (isInAlertWindow(u.component, h)) return "urgent";
  return "safe";
}

interface HoverInfo {
  unit: StockUnit;
  x: number;
  y: number;
}

interface ExpiryHorizonProps {
  units: StockUnit[];
}

export function ExpiryHorizon({ units }: ExpiryHorizonProps) {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<HoverInfo | null>(null);

  // Group units by component
  const grouped = useMemo(() => {
    const map: Record<Component, StockUnit[]> = {
      PLATELETS: [],
      RBC: [],
      PLASMA: [],
    };
    for (const u of units) {
      const comp = u.component as Component;
      if (comp in map) map[comp].push(u);
    }
    return map;
  }, [units]);

  const svgHeight = GROUPS.length * ROW_HEIGHT + AXIS_H + 16;

  // Clamp percent position 0–100
  const xPct = (h: number) =>
    Math.min(100, Math.max(1.5, (Math.max(0, h) / HORIZON_HOURS) * 100));

  // Axis tick labels
  const ticks = [0, 6, 12, 24, 36, 48];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-bold text-text">Expiry Horizon</p>
          <p className="text-2xs text-text-muted mt-0.5">
            Every unit positioned by time remaining — click any dot to inspect
          </p>
        </div>
        <div className="flex items-center gap-4 text-2xs text-text-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            Critical (&lt;6h)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-in-transit" />
            Urgent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-received" />
            Safe
          </span>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="relative px-4 py-4 sm:px-5">
        <svg
          ref={svgRef}
          width="100%"
          height={svgHeight}
          viewBox={`0 0 800 ${svgHeight}`}
          preserveAspectRatio="none"
          aria-label="Expiry horizon visualization — units plotted by hours remaining"
          className="overflow-visible"
        >
          {/* Zone backgrounds */}
          {/* Critical zone: 0–6h (12.5% of 48h) */}
          <rect
            x={LABEL_W}
            y={0}
            width={((6 / 48) * (800 - LABEL_W - PAD_R)).toFixed(1)}
            height={svgHeight - AXIS_H}
            className="horizon-zone-critical"
            fill="hsl(var(--accent) / 0.08)"
          />
          {/* Urgent zone: 6–16h */}
          <rect
            x={(LABEL_W + (6 / 48) * (800 - LABEL_W - PAD_R)).toFixed(1)}
            y={0}
            width={((10 / 48) * (800 - LABEL_W - PAD_R)).toFixed(1)}
            height={svgHeight - AXIS_H}
            fill="hsl(var(--status-in-transit) / 0.06)"
          />

          {/* Group rows */}
          {GROUPS.map((comp, gi) => {
            const rowUnits = grouped[comp];
            const rowY = gi * ROW_HEIGHT + ROW_HEIGHT / 2;
            const clock = componentClock(comp);

            return (
              <g key={comp}>
                {/* Row separator */}
                {gi > 0 && (
                  <line
                    x1={LABEL_W}
                    x2={800 - PAD_R}
                    y1={gi * ROW_HEIGHT}
                    y2={gi * ROW_HEIGHT}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Component label */}
                <text
                  x={LABEL_W - 8}
                  y={rowY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="hsl(var(--text-muted))"
                  fontFamily="var(--font-ui)"
                  className="uppercase tracking-wider"
                >
                  {COMPONENT[comp].label.split(" ")[0].toUpperCase()}
                </text>

                {/* Threshold tick mark */}
                {clock.thresholdHours <= HORIZON_HOURS && (
                  <line
                    x1={(LABEL_W + (clock.thresholdHours / 48) * (800 - LABEL_W - PAD_R)).toFixed(1)}
                    x2={(LABEL_W + (clock.thresholdHours / 48) * (800 - LABEL_W - PAD_R)).toFixed(1)}
                    y1={gi * ROW_HEIGHT + 6}
                    y2={(gi + 1) * ROW_HEIGHT - 6}
                    stroke="hsl(var(--status-in-transit) / 0.4)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Unit dots */}
                {rowUnits.map((u) => {
                  const risk = classifyRisk(u);
                  const pct = xPct(u.hoursRemaining);
                  const cx = LABEL_W + (pct / 100) * (800 - LABEL_W - PAD_R);
                  const r =
                    risk === "critical" ? DOT_CRITICAL : risk === "urgent" ? DOT_URGENT : DOT_SAFE;
                  const fill =
                    risk === "critical"
                      ? "hsl(var(--accent))"
                      : risk === "urgent"
                      ? "hsl(var(--status-in-transit))"
                      : "hsl(var(--status-received))";

                  return (
                    <g key={u.unitId}>
                      {/* Breathing outer ring for critical */}
                      {risk === "critical" && (
                        <circle
                          cx={cx}
                          cy={rowY}
                          r={r + 4}
                          fill="hsl(var(--accent) / 0.18)"
                          className="motion-safe:animate-pulse"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={rowY}
                        r={r}
                        fill={fill}
                        className="cursor-pointer transition-all hover:opacity-80"
                        style={risk === "critical" ? { filter: "drop-shadow(0 0 4px hsl(var(--accent) / 0.6))" } : undefined}
                        onClick={() => navigate(`/centre/units/${u.unitId}`)}
                        onMouseEnter={(e) => {
                          const rect = svgRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const svgEl = e.currentTarget;
                          const cx2 = parseFloat(svgEl.getAttribute("cx") ?? "0");
                          const pctPos = ((cx2 - LABEL_W) / (800 - LABEL_W - PAD_R)) * 100;
                          setHovered({
                            unit: u,
                            x: (pctPos / 100) * rect.width + LABEL_W * (rect.width / 800),
                            y: rowY * (rect.height / svgHeight),
                          });
                        }}
                        onMouseLeave={() => setHovered(null)}
                        aria-label={`${u.bloodGroup} ${u.component}: ${u.hoursRemaining.toFixed(0)}h remaining`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") navigate(`/centre/units/${u.unitId}`);
                        }}
                      />
                      {/* Label for critical units only */}
                      {risk === "critical" && (
                        <text
                          x={cx}
                          y={rowY + r + 12}
                          textAnchor="middle"
                          fontSize={8}
                          fontWeight={600}
                          fill="hsl(var(--accent))"
                          fontFamily="var(--font-ui)"
                        >
                          {u.bloodGroup}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Empty row hint */}
                {rowUnits.length === 0 && (
                  <text
                    x={LABEL_W + 8}
                    y={rowY}
                    dominantBaseline="middle"
                    fontSize={9}
                    fill="hsl(var(--text-subtle))"
                    fontFamily="var(--font-ui)"
                    fontStyle="italic"
                  >
                    no {COMPONENT[comp].label.toLowerCase()} in inventory
                  </text>
                )}
              </g>
            );
          })}

          {/* Horizontal baseline */}
          <line
            x1={LABEL_W}
            x2={800 - PAD_R}
            y1={GROUPS.length * ROW_HEIGHT}
            y2={GROUPS.length * ROW_HEIGHT}
            stroke="hsl(var(--border-strong))"
            strokeWidth={1}
          />

          {/* X-axis ticks */}
          {ticks.map((h) => {
            const x = LABEL_W + (h / 48) * (800 - LABEL_W - PAD_R);
            const isCritical = h === 6;
            const isNow = h === 0;
            return (
              <g key={h}>
                <line
                  x1={x}
                  x2={x}
                  y1={GROUPS.length * ROW_HEIGHT}
                  y2={GROUPS.length * ROW_HEIGHT + 5}
                  stroke="hsl(var(--border-strong))"
                  strokeWidth={0.5}
                />
                <text
                  x={x}
                  y={GROUPS.length * ROW_HEIGHT + 18}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={isCritical || isNow ? 700 : 400}
                  fill={
                    isNow
                      ? "hsl(var(--text))"
                      : isCritical
                      ? "hsl(var(--accent))"
                      : "hsl(var(--text-subtle))"
                  }
                  fontFamily="var(--font-ui)"
                >
                  {isNow ? "NOW" : `${h}h`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-md text-xs"
            style={{
              left: `${Math.min(hovered.x, 70)}%`,
              top: hovered.y - 60,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-bold text-text">
              {hovered.unit.bloodGroup} {hovered.unit.component}
            </p>
            <p className="text-text-muted mt-0.5">
              {hovered.unit.hoursRemaining <= 0
                ? "Expired"
                : `${hovered.unit.hoursRemaining.toFixed(1)}h remaining`}
            </p>
            <p className="text-text-subtle text-2xs font-mono mt-0.5">{hovered.unit.unitId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
