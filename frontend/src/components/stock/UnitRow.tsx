import React from "react";
import type { StockUnit } from "../../api/client";
import { getConfig } from "@pulsechain/shared";
import { ExpiryCountdown } from "./ExpiryCountdown";
import { formatDate } from "../../lib/countdown";
import { Activity, Check, AlertCircle, Truck, PackageCheck, Ban } from "lucide-react";

export const UnitRow: React.FC<{ unit: StockUnit; isMobileCard?: boolean }> = ({
  unit,
  isMobileCard,
}) => {
  const cfg = getConfig();
  const thresholdHours = cfg.thresholdHours[unit.component] ?? cfg.thresholdHours.PLATELETS;
  const isInsideThreshold = unit.hoursRemaining <= thresholdHours && unit.hoursRemaining > 0;

  let rowStyle = "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors";
  let statusBadge = null;

  switch (unit.status) {
    case "RESCUE_PENDING":
      rowStyle =
        "bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 shadow-sm";
      statusBadge = (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold bg-amber-500 text-white rounded-md shadow-sm">
          <Activity className="w-3 h-3 animate-spin" />
          RESCUE PENDING
        </span>
      );
      break;

    case "CLAIMED":
      rowStyle = "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-500";
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded">
          <Check className="w-3 h-3" />
          CLAIMED
        </span>
      );
      break;

    case "IN_TRANSIT":
      rowStyle = "bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-500";
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 rounded">
          <Truck className="w-3 h-3" />
          IN TRANSIT
        </span>
      );
      break;

    case "RECEIVED":
      rowStyle = "bg-slate-100/50 dark:bg-slate-800/30 text-slate-500";
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded">
          <PackageCheck className="w-3 h-3" />
          RECEIVED
        </span>
      );
      break;

    case "LOST":
      rowStyle = "opacity-50 line-through bg-rose-50/30 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300";
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 rounded line-through">
          <Ban className="w-3 h-3" />
          LOST
        </span>
      );
      break;

    case "AVAILABLE":
    default:
      if (isInsideThreshold) {
        rowStyle = "bg-amber-50/30 dark:bg-amber-950/10 border-l-2 border-amber-400";
        statusBadge = (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 rounded">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            NEAR EXPIRY
          </span>
        );
      } else {
        statusBadge = (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded">
            AVAILABLE
          </span>
        );
      }
      break;
  }

  const componentColors: Record<string, string> = {
    PLATELETS: "text-amber-700 dark:text-amber-300 font-bold",
    RBC: "text-red-700 dark:text-red-400 font-bold",
    PLASMA: "text-teal-700 dark:text-teal-300 font-bold",
  };

  // Mobile Card View (Zero horizontal scroll on 390px)
  if (isMobileCard) {
    return (
      <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${rowStyle}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 text-xs font-extrabold rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {unit.bloodGroup}
            </span>
            <span className={`text-xs uppercase tracking-wider ${componentColors[unit.component] ?? ""}`}>
              {unit.component}
            </span>
          </div>
          {statusBadge}
        </div>

        <div className="flex items-center justify-between text-xs py-1 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 mt-2 pt-2">
          <span className="font-mono text-slate-500 font-semibold">{unit.unitId}</span>
          <span className="font-mono tabular-nums">{unit.volumeMl} ml</span>
        </div>

        <div className="flex items-center justify-between text-xs pt-1.5">
          <span className="text-slate-400">{formatDate(unit.collectedAt)}</span>
          <ExpiryCountdown expiresAt={unit.expiresAt} isPastThreshold={isInsideThreshold} />
        </div>
      </div>
    );
  }

  // Desktop Clinical Dense Table Row
  return (
    <tr className={`border-b border-slate-200/80 dark:border-slate-800/80 ${rowStyle}`}>
      <td className="py-2.5 px-3.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
        {unit.unitId}
      </td>
      <td className={`py-2.5 px-3.5 text-xs uppercase tracking-wider ${componentColors[unit.component] ?? ""}`}>
        {unit.component}
      </td>
      <td className="py-2.5 px-3.5">
        <span className="inline-block px-2 py-0.5 text-xs font-extrabold rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono tabular-nums">
          {unit.bloodGroup}
        </span>
      </td>
      <td className="py-2.5 px-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
        {unit.volumeMl} ml
      </td>
      <td className="py-2.5 px-3.5 text-xs text-slate-500 dark:text-slate-400">
        {formatDate(unit.collectedAt)}
      </td>
      <td className="py-2.5 px-3.5">
        <ExpiryCountdown expiresAt={unit.expiresAt} isPastThreshold={isInsideThreshold} />
      </td>
      <td className="py-2.5 px-3.5 text-right">{statusBadge}</td>
    </tr>
  );
};
