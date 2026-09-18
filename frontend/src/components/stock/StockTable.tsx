import React from "react";
import type { StockUnit } from "../../api/client";
import { UnitRow } from "./UnitRow";

interface StockTableProps {
  units: StockUnit[];
}

export const StockTable: React.FC<StockTableProps> = ({ units }) => {
  // Sort soonest-expiring first
  const sorted = [...units].sort((a, b) => {
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  });

  return (
    <div>
      {/* Desktop & Tablet: Dense Clinical Data Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-2.5 px-3.5">Unit ID</th>
              <th className="py-2.5 px-3.5">Component</th>
              <th className="py-2.5 px-3.5">Group</th>
              <th className="py-2.5 px-3.5">Volume</th>
              <th className="py-2.5 px-3.5">Collected</th>
              <th className="py-2.5 px-3.5">Time to Expiry</th>
              <th className="py-2.5 px-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {sorted.map((unit) => (
              <UnitRow key={unit.unitId} unit={unit} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Responsive Card Stack (usable at 390px with zero horizontal scroll) */}
      <div className="md:hidden space-y-3">
        {sorted.map((unit) => (
          <UnitRow key={unit.unitId} unit={unit} isMobileCard />
        ))}
      </div>
    </div>
  );
};
