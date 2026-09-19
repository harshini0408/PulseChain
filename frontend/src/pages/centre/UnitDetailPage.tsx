/**
 * /centre/units/:unitId — one unit's journey.
 *
 * NOTE ON THE TIMELINE BELOW
 * --------------------------
 * GET /units/{id} returns the unit record plus `hoursRemaining`. It does NOT
 * return audit events, and there is no GET /units/{id}/audit endpoint in
 * backend/template.yaml — the AuditEvent records exist in DynamoDB but nothing
 * exposes them over HTTP.
 *
 * So this timeline is DERIVED from the fields that do exist — collectedAt,
 * expiresAt, status, claimedBy, claimedAt, receivedAt, lostAt,
 * activeEscalationId — plus the matching escalation from GET /escalations/active
 * when one is attached. A full audit trail needs that endpoint; until it ships,
 * this is the honest shape of what the API can tell us. No rows are invented.
 *
 * One consequence worth knowing: IN_TRANSIT has no timestamp field on
 * BloodUnit, so that step shows as reached but undated rather than guessing.
 */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Check, Clock, Dot } from "lucide-react";
import { useEscalationsQuery, useFacilityLookup, useUnitQuery } from "../../api/hooks";
import {
  Card,
  ErrorState,
  LoadingState,
} from "../../components/ui";
import { UNIT_STATUS, componentClock, ringToken } from "../../lib/status";
import { escalationForUnit, ringAdvanceAt } from "../../lib/escalation";
import { formatDateTime, formatNumber, formatRelative } from "../../lib/format";
import { UnitDetailHero } from "../../components/stock/UnitDetailHero";

type StepState = "done" | "current" | "pending" | "failed";

interface TimelineStep {
  key: string;
  label: string;
  detail?: string;
  at?: string;
  state: StepState;
}

const STATE_STYLES: Record<StepState, { marker: string; label: string }> = {
  done: { marker: "bg-status-received text-text-inverse", label: "text-text" },
  current: { marker: "bg-accent text-text-inverse", label: "text-text" },
  pending: { marker: "bg-surface-overlay text-text-subtle", label: "text-text-subtle" },
  failed: { marker: "bg-brand-oxblood text-text-inverse", label: "text-text" },
};

export function UnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const unitQuery = useUnitQuery(unitId ?? null);
  const { data: escalations } = useEscalationsQuery();
  const { nameOf } = useFacilityLookup();

  if (unitQuery.isLoading) {
    return <LoadingState variant="detail" rows={5} label="Loading unit" />;
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

  // The moment this unit crossed into its component's alert window is exactly
  // `expiresAt` minus the configured threshold — no endpoint needed.
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
      label: `Entered the ${clock.thresholdHours}-hour window`,
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
        : "Starts when the sweep finds this unit inside its window",
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
      // BloodUnit carries no in-transit timestamp, so this step is dated only
      // by the status having moved past it.
      detail: reached("IN_TRANSIT")
        ? "Courier collected — no timestamp is recorded for this step"
        : reached("RECEIVED")
          ? "Completed"
          : "Marked by the receiving hospital",
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

  // The terminal step is either a safe landing or a loss.
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

  return (
    <div>
      <BackLink />

      <div className="mt-4">
        <UnitDetailHero unit={unit} facilityName={nameOf(unit.facilityId)} />
      </div>

      {/* ── Derived timeline ──────────────────────────────────────────────── */}
      <Card>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-text">Rescue timeline</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Derived from this unit's own record. Steps still ahead are shown dimmed.
            </p>
          </div>
          {escalation && (
            <span
              className={[
                "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold",
                ringToken(escalation.currentRing).pill,
              ].join(" ")}
            >
              <span className={["h-1.5 w-1.5 rounded-full", ringToken(escalation.currentRing).dot].join(" ")} />
              {ringToken(escalation.currentRing).label}
            </span>
          )}
        </div>

        <ol className="relative space-y-6 border-l border-border pl-6">
          {steps.map((step) => {
            const styles = STATE_STYLES[step.state];
            return (
              <li key={step.key} className="relative">
                <span
                  className={[
                    "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-surface-raised",
                    styles.marker,
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {step.state === "done" ? (
                    <Check className="h-3 w-3" />
                  ) : step.state === "current" ? (
                    <Clock className="h-3 w-3" />
                  ) : step.state === "failed" ? (
                    <Dot className="h-4 w-4" />
                  ) : (
                    <Dot className="h-4 w-4" />
                  )}
                </span>

                <p className={["text-sm font-semibold", styles.label].join(" ")}>{step.label}</p>
                {step.at && (
                  <p className="mt-0.5 text-xs tabular-nums text-text-muted" data-numeric="true">
                    {formatDateTime(step.at)}
                    <span className="ml-2 text-text-subtle">{formatRelative(step.at)}</span>
                  </p>
                )}
                {step.detail && (
                  <p className="mt-0.5 text-xs text-text-subtle">{step.detail}</p>
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 border-t border-border pt-4 text-2xs leading-relaxed text-text-subtle">
          A full event-by-event trail would need a <code className="font-mono">GET /units/:id/audit</code>{" "}
          endpoint, which is not deployed. The steps above are derived from the unit record rather
          than fetched, so nothing here is invented.
        </p>
      </Card>

      {unit.claimedBy && (
        <Card className="mt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-status-claimed-bg text-status-claimed">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-widest text-text-subtle">
                Claimed by
              </p>
              <p className="truncate text-sm font-semibold text-text">{nameOf(unit.claimedBy)}</p>
            </div>
          </div>
        </Card>
      )}
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
