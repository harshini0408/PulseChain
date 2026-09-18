/**
 * /hospital/transfers — chain of custody for units this facility claimed.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * A hospital's own stock query cannot be the only source here. The backend
 * moves a unit's `facilityId` to the recipient only on RECEIVED
 * (backend/src/api/transfers.ts), so a CLAIMED or IN_TRANSIT unit is still
 * filed under the origin blood centre and never appears in
 * GET /facilities/{hospitalId}/stock.
 *
 * So the page composes two deployed endpoints:
 *   - GET /facilities/{id}/inbox names the units this facility claimed;
 *   - GET /units/{id} gives each of those its live status and timestamps.
 * Units already RECEIVED arrive through the stock query as well, and the two
 * sets are merged by unit ID.
 */

import { useMemo } from "react";
import { Truck } from "lucide-react";
import type { UnitStatus } from "@pulsechain/shared";
import { useAuth } from "../../auth/AuthProvider";
import { useFacilityLookup, useInboxQuery, useStockQuery, useUnitsQuery } from "../../api/hooks";
import type { StockUnit } from "../../api/client";
import { TransferTimeline } from "../../components/transfers/TransferTimeline";
import { TransferActions } from "../../components/transfers/TransferActions";
import {
  BloodGroupToken,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
} from "../../components/ui";
import { ConnectionDot } from "../../components/layout/ConnectionDot";
import { componentClock } from "../../lib/status";
import { calculateRemaining } from "../../lib/countdown";
import { formatDistanceKm, formatNumber, pluralise } from "../../lib/format";

const IN_CUSTODY: UnitStatus[] = ["CLAIMED", "IN_TRANSIT", "RECEIVED"];

/**
 * The emotional payoff, in one sentence and no more: what arrived, and how
 * close it came. Computed from expiresAt minus receivedAt.
 */
function saveSentence(unit: StockUnit): string {
  const margin = calculateRemaining(unit.expiresAt, new Date(unit.receivedAt as string).getTime());
  const clock = componentClock(unit.component).label.toLowerCase();

  if (margin.isExpired) {
    return `This ${unit.bloodGroup} ${clock} unit arrived as its clock ran out.`;
  }

  return `This ${unit.bloodGroup} ${clock} unit reached you with ${margin.label} left on its clock.`;
}

export function TransfersPage() {
  const { facilityId } = useAuth();
  const { nameOf } = useFacilityLookup();

  const inbox = useInboxQuery(facilityId);
  const stock = useStockQuery(facilityId);

  // Units this facility claimed, per the inbox.
  const claimedUnitIds = useMemo(
    () =>
      Array.from(
        new Set((inbox.data ?? []).filter((o) => o.status === "CLAIMED").map((o) => o.unitId)),
      ),
    [inbox.data],
  );

  const claimedUnits = useUnitsQuery(claimedUnitIds);

  // unitId -> the facility that sent it, from the offer that produced it.
  const originByUnit = useMemo(() => {
    const map = new Map<string, { facilityId: string; distanceKm?: number }>();
    for (const offer of inbox.data ?? []) {
      map.set(offer.unitId, {
        facilityId: offer.originFacilityId,
        distanceKm: offer.breakdown?.distanceKm,
      });
    }
    return map;
  }, [inbox.data]);

  const units = useMemo(() => {
    const byId = new Map<string, StockUnit>();
    // Units already held here (RECEIVED), then the in-flight ones by ID.
    for (const u of stock.data ?? []) byId.set(u.unitId, u);
    for (const u of claimedUnits.units) byId.set(u.unitId, u);

    return Array.from(byId.values())
      .filter((u) => IN_CUSTODY.includes(u.status))
      // Everything here was claimed by this facility, or is now held by it.
      .filter((u) => u.claimedBy === facilityId || u.facilityId === facilityId);
  }, [stock.data, claimedUnits.units, facilityId]);

  const inProgress = units.filter((u) => u.status !== "RECEIVED");
  const completed = units
    .filter((u) => u.status === "RECEIVED")
    .sort((a, b) => new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime());

  const isLoading = inbox.isLoading || stock.isLoading;
  const isError = inbox.isError || stock.isError;
  const error = inbox.error ?? stock.error;

  const retry = () => {
    void inbox.refetch();
    void stock.refetch();
    claimedUnits.refetch();
  };

  const renderUnit = (unit: StockUnit) => {
    const origin = originByUnit.get(unit.unitId);

    return (
      <Card key={unit.unitId} className="space-y-4">
        <div className="flex flex-wrap items-start gap-4">
          <BloodGroupToken bloodGroup={unit.bloodGroup} component={unit.component} size="sm" />

          <div className="min-w-0 flex-1">
            <p className="font-mono text-2xs text-text-muted">{unit.unitId}</p>
            <p className="mt-0.5 text-sm font-semibold text-text">
              {formatNumber(unit.volumeMl)} ml
              {origin && (
                <>
                  <span className="mx-1.5 text-border-strong">·</span>
                  <span className="font-normal text-text-muted">
                    from {nameOf(origin.facilityId)}
                  </span>
                  {origin.distanceKm !== undefined && (
                    <span className="font-normal text-text-subtle">
                      {" "}
                      ({formatDistanceKm(origin.distanceKm)})
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            <StatusPill kind="unit" value={unit.status} size="sm" withDot />
            <TransferActions unitId={unit.unitId} status={unit.status} />
          </div>
        </div>

        <div className="rounded-xl bg-surface-sunken px-4 py-3.5">
          <TransferTimeline
            status={unit.status}
            claimedAt={unit.claimedAt}
            receivedAt={unit.receivedAt}
          />
        </div>

        {unit.status === "RECEIVED" && unit.receivedAt && (
          <p className="border-t border-border pt-3.5 text-sm font-medium text-status-received">
            {saveSentence(unit)}
          </p>
        )}
      </Card>
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Hospital"
        title="Transfers"
        subtitle="Chain of custody for every unit you claimed"
        actions={<ConnectionDot />}
      />

      {isLoading ? (
        <LoadingState variant="cards" rows={2} label="Loading transfers" />
      ) : isError ? (
        <ErrorState
          title="Transfers did not load"
          message={error instanceof Error ? error.message : "The transfer data did not respond."}
          onRetry={retry}
        />
      ) : units.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="No transfers in progress"
          message="A unit appears here the moment you claim it from the offer inbox, and stays until you confirm it arrived."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold text-text">In progress</h2>
              <span className="text-xs text-text-muted">{pluralise(inProgress.length, "unit")}</span>
            </div>
            {inProgress.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                Nothing is in transit. Claimed units appear here for dispatch.
              </p>
            ) : (
              <div className="space-y-4">{inProgress.map(renderUnit)}</div>
            )}
          </section>

          {completed.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold text-text">Completed</h2>
                <span className="text-xs text-text-muted">{pluralise(completed.length, "unit")}</span>
              </div>
              <div className="space-y-4">{completed.map(renderUnit)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
