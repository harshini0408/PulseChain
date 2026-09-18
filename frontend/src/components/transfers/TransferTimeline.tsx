import React from "react";
import { Check, Circle, Truck, PackageCheck } from "lucide-react";

interface TransferTimelineProps {
  status: string; // CLAIMED | IN_TRANSIT | RECEIVED
}

export const TransferTimeline: React.FC<TransferTimelineProps> = ({ status }) => {
  const steps = [
    { id: "CLAIMED", label: "Claimed", icon: Check },
    { id: "IN_TRANSIT", label: "In Transit", icon: Truck },
    { id: "RECEIVED", label: "Received", icon: PackageCheck },
  ];

  const getStepState = (stepId: string) => {
    if (status === "RECEIVED") return "completed";
    if (status === "IN_TRANSIT") {
      if (stepId === "CLAIMED") return "completed";
      if (stepId === "IN_TRANSIT") return "current";
      return "upcoming";
    }
    if (status === "CLAIMED") {
      if (stepId === "CLAIMED") return "current";
      return "upcoming";
    }
    return "upcoming";
  };

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const state = getStepState(step.id);
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  state === "completed"
                    ? "bg-emerald-600 text-white"
                    : state === "current"
                    ? "bg-blue-600 text-white animate-pulse"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <Icon className="w-3 h-3" />
              </span>
              <span
                className={`text-xs font-semibold ${
                  state === "completed"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : state === "current"
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-6 h-0.5 ${
                  state === "completed"
                    ? "bg-emerald-500"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
