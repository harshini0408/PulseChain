/**
 * Requisitions for one facility. DONOR_TIER carries its own treatment from
 * lib/status.ts because it is the point at which the network stops looking for
 * stock and starts calling donors.
 */

import type { Requisition } from "@pulsechain/shared";
import { StatusPill } from "../ui/StatusPill";
import { formatDateTime, formatRelative, pluralise } from "../../lib/format";
import { COMPONENT } from "../../lib/status";

interface RequisitionListProps {
  requisitions: Requisition[];
}

export function RequisitionList({ requisitions }: RequisitionListProps) {
  return (
    <ul className="space-y-3">
      {requisitions.map((req) => (
        <li
          key={req.reqId}
          className="rounded-xl border border-border bg-surface-raised p-4 shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-accent">{req.bloodGroup}</span>
                <span className="text-sm font-semibold text-text">
                  {COMPONENT[req.component].label}
                </span>
                <span className="text-sm tabular-nums text-text-muted" data-numeric="true">
                  · {pluralise(req.unitsRequested, "unit")}
                </span>
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Needed by {formatDateTime(req.neededBy)}
                <span className="ml-1.5 text-text-subtle">({formatRelative(req.neededBy)})</span>
              </p>
              {req.rawText && (
                <p className="mt-2 border-l-2 border-border pl-2.5 text-xs italic leading-relaxed text-text-subtle">
                  {req.rawText}
                </p>
              )}
            </div>

            <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
              <StatusPill kind="requisition" value={req.status} size="sm" />
              <StatusPill kind="urgency" value={req.urgency} size="sm" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <span className="font-mono text-2xs text-text-subtle">{req.reqId}</span>
            <span className="text-2xs tabular-nums text-text-muted" data-numeric="true">
              {req.unitsFilled} of {req.unitsRequested} filled
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
