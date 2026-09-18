import React, { useState } from "react";
import { useInTransitMutation, useReceivedMutation } from "../../api/hooks";
import { Truck, PackageCheck, Loader2 } from "lucide-react";

interface TransferActionsProps {
  unitId: string;
  status: string;
  onSuccess?: () => void;
}

export const TransferActions: React.FC<TransferActionsProps> = ({
  unitId,
  status,
  onSuccess,
}) => {
  const inTransitMutation = useInTransitMutation();
  const receivedMutation = useReceivedMutation();

  const [courier, setCourier] = useState("PulseChain Express Dispatch");

  const handleDispatch = async () => {
    try {
      await inTransitMutation.mutateAsync(unitId);
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to mark in-transit:", err);
    }
  };

  const handleReceived = async () => {
    try {
      await receivedMutation.mutateAsync(unitId);
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to mark received:", err);
    }
  };

  if (status === "CLAIMED") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDispatch}
          disabled={inTransitMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
        >
          {inTransitMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Truck className="w-3.5 h-3.5" />
          )}
          <span>Dispatch (Mark In-Transit)</span>
        </button>
      </div>
    );
  }

  if (status === "IN_TRANSIT") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReceived}
          disabled={receivedMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
        >
          {receivedMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PackageCheck className="w-3.5 h-3.5" />
          )}
          <span>Confirm Receipt (Mark Received)</span>
        </button>
      </div>
    );
  }

  if (status === "RECEIVED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Unit Received & Stocked</span>
      </span>
    );
  }

  return null;
};
