import React from "react";
import type { Component } from "@pulsechain/shared";
import { Clock } from "lucide-react";

interface ComponentClockBadgeProps {
  component: Component;
}

export const ComponentClockBadge: React.FC<ComponentClockBadgeProps> = ({ component }) => {
  const meta: Record<Component, { label: string; shelfLife: string; bg: string; text: string }> = {
    PLATELETS: {
      label: "Platelets",
      shelfLife: "5 days",
      bg: "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-300",
    },
    RBC: {
      label: "Red Blood Cells",
      shelfLife: "42 days",
      bg: "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800",
      text: "text-red-800 dark:text-red-300",
    },
    PLASMA: {
      label: "Fresh Frozen Plasma",
      shelfLife: "1 year",
      bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
      text: "text-amber-700 dark:text-amber-400",
    },
  };

  const item = meta[component] ?? {
    label: component,
    shelfLife: "Unknown",
    bg: "bg-slate-100 dark:bg-slate-800 border-slate-300",
    text: "text-slate-700 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${item.bg} ${item.text}`}
    >
      <Clock className="w-3 h-3" />
      <span>{item.label}</span>
      <span className="opacity-75">({item.shelfLife})</span>
    </span>
  );
};
