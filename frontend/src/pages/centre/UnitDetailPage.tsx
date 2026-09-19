/**
 * /centre/units/:unitId — one unit's rescue journey.
 *
 * New composition:
 *  1. FULL-BLEED SCENE HEADER — blood group + countdown + status (no card border)
 *  2. VISUAL FLOW TIMELINE — horizontal/vertical node chain, not a list in a Card
 *  3. DETAIL STRIP — volume, timestamps, facility as clean text rows
 *
 * All existing data is preserved; presentation is materially changed.
 * No audit endpoint exists — timeline is derived from unit fields (unchanged).
 */

import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2 } from "lucide-react";
import { useEscalationsQuery, useFacilityLookup, useUnitQuery } from "../../api/hooks";
import { ErrorState, LoadingState } from "../../components/ui";
import { UNIT_STATUS, componentClock, ringToken } from "../../lib/status";
import { escalationForUnit, ringAdvanceAt } from "../../lib/escalation";
import { formatDateTime, formatNumber, formatRelative } from "../../lib/format";
import { ExpiryClock } from "../../components/visualizations/ExpiryClock";

type StepState = "done" | "current" | "pending" | "failed";

interface TimelineStep {
  key: string;
  label: string;
  detail?: string;
  at?: string;
  state: StepState;
}

export function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const unitQuery = useUnitQuery(unitId ?? null);
  const { data: escalations } = useEscalationsQuery();
  const { nameOf } = useFacilityLookup();

  if (unitQuery.isLoading) {
    return <LoadingState variant="detail" rows={5} label="Loading unit…" />;
  }

  if (unitQuery.isError || !unitQuery.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          title="This unit did not load"
          message={
            unitQuery.error instanceof Error
              ? unitQuery.error.message
              : `No unit record came back for ${unitId}.`
          }
          onRetry={() => void unitQuery.refetch()}
        />
      </div>
    );
  }

  const unit = unitQuery.data;
  const clock = componentClock(unit.component);
  const escalation = escalationForUnit(escalations, unit.unitId, unit.activeEscalationId);

  const alertAt = new Date(
    new Date(unit.expiresAt).getTime() - clock.thresholdHours * 3600 * 1000,
  ).toISOString();

  const isLost = unit.status === "LOST";
  const reached = (...statuses: string[]) => statuses.includes(unit.status);

  const steps: TimelineStep[] = [
    {
      key: "collected",
      label: "Collected",
      at: unit.collectedAt,
      detail: `${formatNumber(unit.volumeMl)} ml drawn`,
      state: "done",
    },
    {
      key: "alert",
      label: `${clock.thresholdHours}h window entered`,
      at: alertAt,
      detail: new Date(alertAt).getTime() <= Date.now() ? undefined : "Not yet reached",
      state: new Date(alertAt).getTime() <= Date.now() ? "done" : "pending",
    },
    {
      key: "rescue",
      label: "Rescue started",
      at: escalation?.startedAt,
      detail: escalation
        ? `${ringToken(escalation.currentRing).label} · next ring ${formatRelative(
            ringAdvanceAt(escalation.startedAt, escalation.currentRing),
          )}`
        : "Starts when the sweep finds this unit",
      state: escalation
        ? unit.status === "RESCUE_PENDING"
          ? "current"
          : "done"
        : reached("CLAIMED", "IN_TRANSIT", "RECEIVED")
        ? "done"
        : "pending",
    },
    {
      key: "claimed",
      label: UNIT_STATUS.CLAIMED.label,
      at: unit.claimedAt,
      detail: unit.claimedBy ? `by ${nameOf(unit.claimedBy)}` : "No hospital has claimed it yet",
      state: unit.claimedAt
        ? unit.status === "CLAIMED"
          ? "current"
          : "done"
        : "pending",
    },
    {
      key: "in-transit",
      label: UNIT_STATUS.IN_TRANSIT.label,
      detail: reached("IN_TRANSIT")
        ? "Courier collected"
        : reached("RECEIVED")
        ? "Completed"
        : "Confirmed by courier",
      state: reached("IN_TRANSIT") ? "current" : reached("RECEIVED") ? "done" : "pending",
    },
    {
      key: "received",
      label: UNIT_STATUS.RECEIVED.label,
      at: unit.receivedAt,
      detail: unit.receivedAt ? "Chain of custody closed" : "Confirmed on arrival",
      state: unit.receivedAt ? "done" : "pending",
    },
  ];

  steps.push(
    isLost
      ? {
          key: "lost",
          label: UNIT_STATUS.LOST.label,
          at: unit.lostAt,
          detail: "Expired before anyone claimed it",
          state: "failed",
        }
      : {
          key: "expires",
          label: "Expires",
          at: unit.expiresAt,
          detail: unit.status === "RECEIVED" ? "Reached a patient first" : undefined,
          state: unit.status === "RECEIVED" ? "done" : "pending",
        },
  );

  // Status display label
  const statusMeta = UNIT_STATUS[unit.status as keyof typeof UNIT_STATUS];
  const isCriticalStatus = unit.status === "RESCUE_PENDING";

  return (
    <div>
      <BackLink />

      {/* ── 1. FULL-BLEED SCENE HEADER ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
        className="relative mt-5 mb-8 overflow-hidden rounded-3xl brand-field border border-border/70 p-6 sm:p-8"
      >
        {/* Background glow for critical state */}
        {isCriticalStatus && (
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at 30% 50%, hsl(var(--accent) / 0.12) 0%, transparent 70%)",
            }}
          />
        )}

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
          {/* Blood group — dominant */}
          <div className="flex-shrink-0">
            <p className="text-2xs font-bold uppercase tracking-widest text-text-subtle mb-1">
              {unit.component}
            </p>
            <p
              className="hero-number text-text leading-none"
              style={{ fontSize: "clamp(4rem, 12vw, 9rem)" }}
            >
              {unit.bloodGroup}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-24 w-px bg-border/60" />

          {/* Countdown + clock */}
          <div className="flex flex-col items-start gap-3">
            <ExpiryClock expiresAt={unit.expiresAt} size={80} />
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-text-subtle">
                Time remaining
              </p>
              <p className="font-display text-2xl font-bold text-text mt-0.5 tabular-nums">
                {unit.hoursRemaining <= 0
                  ? "Expired"
                  : unit.hoursRemaining < 24
                  ? `${Math.floor(unit.hoursRemaining)}h ${Math.round((unit.hoursRemaining % 1) * 60)}m`
                  : `${(unit.hoursRemaining / 24).toFixed(1)} days`}
              </p>
            </div>
          </div>

          {/* Status + escalation ring */}
          <div className="sm:ml-auto flex flex-col items-start sm:items-end gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                isCriticalStatus
                  ? "bg-accent text-white"
                  : "bg-surface-raised border border-border text-text",
              ].join(" ")}
            >
              {isCriticalStatus && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
              )}
              {statusMeta?.label ?? unit.status}
            </span>
            {escalation && (
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold",
                  ringToken(escalation.currentRing).pill,
                ].join(" ")}
              >
                <span
                  className={["h-1.5 w-1.5 rounded-full", ringToken(escalation.currentRing).dot].join(" ")}
                />
                {ringToken(escalation.currentRing).label}
              </span>
            )}
            <p className="text-2xs text-text-subtle font-mono mt-1">{unit.unitId}</p>
          </div>
        </div>

        {/* Facility strip */}
        <div className="relative mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-text-muted">
          <Building2 className="h-3.5 w-3.5 text-text-subtle flex-shrink-0" />
          <span>{nameOf(unit.facilityId)}</span>
          {unit.claimedBy && (
            <>
              <span className="text-border-strong">→</span>
              <span className="font-semibold text-text">{nameOf(unit.claimedBy)}</span>
            </>
          )}
        </div>
      </motion.section>

      {/* ── 2. VISUAL FLOW TIMELINE ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Rescue timeline</h2>
          <p className="text-xs text-text-muted">
            Derived from unit record — no invented data
          </p>
        </div>

        {/* Visual flow — nodes connected by line */}
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-status-received via-border to-border/30" />

          <ol className="space-y-0">
            {steps.map((step, i) => {
              const isDone = step.state === "done";
              const isCurrent = step.state === "current";
              const isFailed = step.state === "failed";
              const isPending = step.state === "pending";

              const nodeColor = isDone
                ? "bg-status-received ring-status-received/20"
                : isCurrent
                ? "bg-accent ring-accent/30"
                : isFailed
                ? "bg-status-lost ring-status-lost/20"
                : "bg-surface-overlay ring-border";

              const textColor = isPending ? "text-text-subtle" : "text-text";

              return (
                <motion.li
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isPending ? 0.55 : 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                  className="relative flex gap-5 pb-6 last:pb-0"
                >
                  {/* Node */}
                  <div className="flex-shrink-0 relative z-10">
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full ring-4 text-text-inverse text-xs font-bold transition-all",
                        nodeColor,
                        isCurrent ? "unit-breathe shadow-md" : "",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : isFailed ? "✗" : isCurrent ? "●" : String(i + 1)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="pt-1 min-w-0 flex-1">
                    <p className={["text-sm font-semibold", textColor].join(" ")}>
                      {step.label}
                    </p>
                    {step.at && (
                      <p className="mt-0.5 text-xs tabular-nums text-text-muted">
                        {formatDateTime(step.at)}
                        <span className="ml-2 text-text-subtle">{formatRelative(step.at)}</span>
                      </p>
                    )}
                    {step.detail && (
                      <p className="mt-0.5 text-xs text-text-subtle">{step.detail}</p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>

        <p className="mt-6 text-2xs leading-relaxed text-text-subtle border-t border-border pt-4">
          A full event-by-event trail would need a{" "}
          <code className="font-mono">GET /units/:id/audit</code> endpoint, which is not deployed.
        </p>
      </motion.section>

      {/* ── 3. DETAIL STRIP ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="rounded-2xl border border-border bg-surface-raised p-5 grid grid-cols-2 sm:grid-cols-3 gap-4"
      >
        {[
          { label: "Volume", value: `${formatNumber(unit.volumeMl)} ml` },
          { label: "Component", value: unit.component },
          { label: "Blood group", value: unit.bloodGroup },
          { label: "Collected", value: unit.collectedAt ? formatDateTime(unit.collectedAt) : "—" },
          { label: "Expires", value: formatDateTime(unit.expiresAt) },
          { label: "Facility", value: nameOf(unit.facilityId) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-subtle">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-text">{value}</p>
          </div>
        ))}
      </motion.section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/centre/stock"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Stock console
    </Link>
  );
}
