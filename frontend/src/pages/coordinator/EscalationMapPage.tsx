/**
 * /coordinator/escalations — the corridor at a glance.
 *
 * Map left, list right on desktop. Below 1024px the two stack with the list
 * first, because the list is the half that works on a phone.
 */

import { useState } from "react";
import { Radio } from "lucide-react";
import { getConfig } from "@pulsechain/shared";
import {
  useEscalationsQuery,
  useFacilityLookup,
  useUnitQuery,
} from "../../api/hooks";
import { CorridorMap } from "../../components/escalation/CorridorMap";
import { EscalationList } from "../../components/escalation/EscalationList";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
} from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { ringRangeLabel, ringToken } from "../../lib/status";
import { ringAdvanceAt } from "../../lib/escalation";
import { formatRelative } from "../../lib/format";

export function EscalationMapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const escalationsQuery = useEscalationsQuery();
  const { facilities, nameOf, isLoading: facilitiesLoading } = useFacilityLookup();

  const escalations = escalationsQuery.data ?? [];

  // Default to the newest escalation without fighting the operator's choice.
  const selected =
    escalations.find((e) => e.escalationId === selectedId) ?? escalations[0] ?? undefined;

  // The claimant is real data: it comes from the escalating unit's own record.
  const subjectUnit = useUnitQuery(
    selected?.subjectType === "UNIT" ? selected.subjectId : null,
  );
  const claimantFacilityId = subjectUnit.data?.claimedBy;

  const isLoading = escalationsQuery.isLoading || facilitiesLoading;
  const running = escalations.filter((e) => e.status === "RUNNING");
  const { rings } = getConfig();

  return (
    <div>
      <PageHeader
        eyebrow="Coordinator"
        title="Escalation corridor"
        subtitle="Where every live rescue has reached"
        actions={<ConnectionDot />}
      />

      {isLoading ? (
        <LoadingState variant="map" label="Loading the corridor" />
      ) : escalationsQuery.isError ? (
        <ErrorState
          title="Escalations did not load"
          message={
            escalationsQuery.error instanceof Error
              ? escalationsQuery.error.message
              : "The escalations endpoint did not respond."
          }
          onRetry={() => void escalationsQuery.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[3fr_2fr]">
          {/* List first in the DOM so it comes first on a phone; the map is
              ordered back above it on desktop. */}
          <div className="order-1 lg:order-2">
            <Card>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold text-text">Active escalations</h2>
                <span className="text-xs text-text-muted">
                  {running.length} running
                </span>
              </div>

              {escalations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                  Nothing is escalating. The corridor is quiet.
                </p>
              ) : (
                <EscalationList
                  escalations={escalations}
                  selectedId={selected?.escalationId ?? null}
                  onSelect={setSelectedId}
                />
              )}
            </Card>

            {selected && (
              <Card className="mt-4">
                <h3 className="mb-3 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                  Selected
                </h3>
                <dl className="space-y-2.5 text-sm">
                  <Row label="Subject" value={selected.subjectId} mono />
                  <Row label="Type" value={selected.subjectType} />
                  <Row
                    label="Origin"
                    value={selected.originFacilityId ? nameOf(selected.originFacilityId) : "—"}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Ring</dt>
                    <dd
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold",
                        ringToken(selected.currentRing).pill,
                      ].join(" ")}
                    >
                      {ringToken(selected.currentRing).label} ·{" "}
                      {ringRangeLabel(selected.currentRing)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Status</dt>
                    <dd>
                      <StatusPill kind="escalation" value={selected.status} size="sm" />
                    </dd>
                  </div>
                  <Row label="Started" value={formatRelative(selected.startedAt)} />
                  {selected.status === "RUNNING" && (
                    <Row
                      label="Next ring"
                      value={formatRelative(
                        ringAdvanceAt(selected.startedAt, selected.currentRing),
                      )}
                    />
                  )}
                  {claimantFacilityId && (
                    <Row label="Claimed by" value={nameOf(claimantFacilityId)} />
                  )}
                </dl>
              </Card>
            )}
          </div>

          {/* ── Map ─────────────────────────────────────────────────────── */}
          <div className="order-2 lg:order-1">
            <Card>
              {escalations.length === 0 ? (
                <EmptyState
                  icon={<Radio className="h-6 w-6" />}
                  title="The corridor is quiet"
                  message="No unit is escalating right now. When one crosses into its expiry window, its rescue appears here and the rings light up in order."
                  className="border-0"
                />
              ) : (
                <>
                  <CorridorMap
                    facilities={facilities}
                    escalation={selected}
                    claimantFacilityId={claimantFacilityId}
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                    {rings
                      .filter((r) => r.ring !== 3)
                      .map((band) => (
                        <span key={band.ring} className="flex items-center gap-1.5">
                          <span
                            className={["h-2 w-2 rounded-full", ringToken(band.ring).dot].join(" ")}
                          />
                          <span className="text-2xs text-text-muted">
                            {ringToken(band.ring).label} · {ringRangeLabel(band.ring)}
                          </span>
                        </span>
                      ))}
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-status-received" />
                      <span className="text-2xs text-text-muted">Claimed</span>
                    </span>
                    <span className="flex items-center gap-1.5 sm:ml-auto">
                      <span className="h-2 w-2 rounded-full bg-brand-oxblood" />
                      <span className="text-2xs text-text-muted">Origin</span>
                    </span>
                  </div>

                  <p className="mt-3 text-2xs leading-relaxed text-text-subtle">
                    Highlighted facilities are the ones inside the escalating ring, computed from
                    real coordinates. No deployed endpoint lists offers network-wide, so this shows
                    who is being offered the unit rather than who currently holds an open offer.
                  </p>
                </>
              )}
            </Card>

            {/* ── Network strip ───────────────────────────────────────────── */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Strip label="Active escalations" value={running.length} />
              <Strip label="Facilities" value={facilities.length} />
              <Strip
                label="Ring reached"
                value={selected ? selected.currentRing : 0}
                suffix={selected ? ` of ${rings.length}` : ""}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex-shrink-0 text-text-muted">{label}</dt>
      <dd className={["truncate text-right font-medium text-text", mono ? "font-mono text-xs" : ""].join(" ")}>
        {value}
      </dd>
    </div>
  );
}

function Strip({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-3 text-center shadow-card">
      <p className="text-xl font-bold tabular-nums text-text" data-numeric="true">
        {value}
        {suffix && <span className="text-sm font-normal text-text-subtle">{suffix}</span>}
      </p>
      <p className="mt-0.5 text-2xs font-medium uppercase tracking-widest text-text-subtle">
        {label}
      </p>
    </div>
  );
}
