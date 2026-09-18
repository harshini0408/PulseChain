/**
 * The stock table. Sorted by `expiresAt` ascending by default, so the unit
 * closest to expiry is always the first thing on screen — the console's whole
 * job is to put the next thing to lose at the top.
 */

import type { ActiveEscalation, StockUnit } from "../../api/client";
import { UnitRow } from "./UnitRow";
import { escalationForUnit } from "../../lib/escalation";

interface StockTableProps {
  units: StockUnit[];
  escalations?: ActiveEscalation[];
}

const COLUMNS = ["Unit", "Component", "Group", "Expires in", "Status", "Rescue", ""];

export function StockTable({ units, escalations }: StockTableProps) {
  const sorted = [...units].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  );

  const escalationFor = (unit: StockUnit) =>
    escalationForUnit(escalations, unit.unitId, unit.activeEscalationId);

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface-raised shadow-card md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {COLUMNS.map((label, i) => (
                <th
                  key={label || `col-${i}`}
                  scope="col"
                  className="px-3 py-2.5 text-2xs font-semibold uppercase tracking-widest text-text-muted first:pl-4 last:pr-4"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((unit) => (
              <UnitRow key={unit.unitId} unit={unit} escalation={escalationFor(unit)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {sorted.map((unit) => (
          <UnitRow
            key={unit.unitId}
            unit={unit}
            escalation={escalationFor(unit)}
            variant="card"
          />
        ))}
      </div>
    </>
  );
}
