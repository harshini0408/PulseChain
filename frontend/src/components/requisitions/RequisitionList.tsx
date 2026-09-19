/**
 * Requisitions for one facility. DONOR_TIER carries its own treatment from
 * lib/status.ts because it is the point at which the network stops looking for
 * stock and starts calling donors.
 */

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
      {requisitions.map((req) => {
        const id = req.id || req.reqId;
        return (
          <li
            key={id}
            className="group rounded-xl border border-border bg-surface-raised p-4 shadow-card hover:border-border-strong transition-colors"
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
                  Needed by {formatDateTime(req.neededBy || req.requiredBy)}
                  <span className="ml-1.5 text-text-subtle">({formatRelative(req.neededBy || req.requiredBy)})</span>
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
              <span className="font-mono text-2xs text-text-subtle">{id}</span>
              <div className="flex items-center gap-3">
                <span className="text-2xs tabular-nums text-text-muted" data-numeric="true">
                  {(req.unitsFulfilled ?? req.unitsFilled ?? 0)} of {req.unitsRequested} fulfilled
                </span>
                <Link
                  to={`/hospital/requisitions/${id}`}
                  className="inline-flex items-center gap-1 text-2xs font-semibold text-accent hover:underline"
                >
                  View details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
