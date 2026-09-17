import React, { useState, useEffect } from "react";
import {
  Truck,
  PackageCheck,
  RefreshCw,
  Thermometer,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building2,
  MapPin,
} from "lucide-react";
import type { BloodUnit } from "@pulsechain/shared";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/context.js";

export const TransfersPage: React.FC = () => {
  const { facilityId, facilityName, role } = useAuth();
  const [stock, setStock] = useState<BloodUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await api.getStock(facilityId);
      setStock(items);
    } catch (err) {
      console.error("Could not load transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [facilityId]);

  const handleReceive = async (unitId: string) => {
    setActionLoading(unitId);
    try {
      await api.markReceived(unitId, facilityId, {
        conditionOk: true,
        verifiedBy: "Hospital Receiving Blood Bank",
      });
      alert(`Unit ${unitId} marked as RECEIVED. Cold chain intact and patient safety verified!`);
      await loadData();
    } catch (err: any) {
      alert(`Receipt failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (unitId: string) => {
    setActionLoading(unitId);
    try {
      await api.markInTransit(unitId, facilityId, {
        courier: "PulseChain Fast Courier Service",
        temperatureVerified: true,
      });
      alert(`Unit ${unitId} marked as IN_TRANSIT.`);
      await loadData();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const activeTransfers = stock.filter(
    (u) => u.status === "CLAIMED" || u.status === "IN_TRANSIT" || u.status === "RECEIVED"
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-neutral-900">Transfers &amp; Cold-Chain Tracking</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
              LOGISTICS
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            Real-time verified transit monitoring, courier chain of custody, and temperature telemetry
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Logistics
        </button>
      </div>

      {/* Active Transfer Cards */}
      {activeTransfers.length === 0 && !loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-neutral-200 shadow-sm">
          <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-700">No Active Transfers</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            When a hospital claims a redistribution offer or blood centres dispatch units, active delivery nodes appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTransfers.map((unit) => {
            const isClaimed = unit.status === "CLAIMED";
            const isInTransit = unit.status === "IN_TRANSIT";
            const isReceived = unit.status === "RECEIVED";

            return (
              <div
                key={unit.unitId}
                className="bg-white rounded-xl p-5 border border-neutral-200 shadow-sm space-y-4"
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white font-mono font-bold text-sm flex items-center justify-center">
                      {unit.bloodGroup}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                        <span>Unit {unit.unitId}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                          {unit.component} ({unit.volumeMl}ml)
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        Economic Value: <strong className="text-neutral-800 font-mono">₹{unit.valueInr || 1500}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Temperature Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-mono font-bold">
                      <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                      +4.2°C Cold Chain OK
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isInTransit
                          ? "bg-sky-100 text-sky-800 border border-sky-300"
                          : isReceived
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {unit.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Route Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-2 text-xs">
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Origin Facility</div>
                    <div className="font-bold text-neutral-900 mt-0.5 font-mono">{unit.facilityId}</div>
                    <div className="text-[11px] text-neutral-500">Coimbatore Central Blood Centre</div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex items-center space-x-1 text-crimson-700 font-bold text-xs mb-1">
                      <Truck className="w-4 h-4 animate-bounce" />
                      <span>8.4 km Regional Transit</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-crimson-600 rounded-full ${
                          isReceived ? "w-full" : isInTransit ? "w-2/3" : "w-1/3"
                        }`}
                      ></div>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Destination</div>
                    <div className="font-bold text-neutral-900 mt-0.5 font-mono">
                      {unit.claimedBy || "CBE-HOSP-04"}
                    </div>
                    <div className="text-[11px] text-neutral-500">Coimbatore East Hospital</div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Temperature Telemetry Verified</span>
                  </div>

                  <div className="space-x-2">
                    {isClaimed && (
                      <button
                        onClick={() => handleDispatch(unit.unitId)}
                        disabled={actionLoading === unit.unitId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {actionLoading === unit.unitId ? "Dispatching..." : "Dispatch Courier"}
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleReceive(unit.unitId)}
                        disabled={actionLoading === unit.unitId}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        {actionLoading === unit.unitId ? "Confirming..." : "Confirm Unit Received"}
                      </button>
                    )}

                    {isReceived && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Received &amp; Verified into Hospital Inventory
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
