import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  RefreshCw,
  Clock,
  Truck,
  Eye,
  AlertTriangle,
  Droplets,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Search,
  X,
} from "lucide-react";
import type { BloodUnit, Component, BloodGroup } from "@pulsechain/shared";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/context.js";
import { CountdownBadge } from "../../components/CountdownBadge.js";

export const StockConsole: React.FC = () => {
  const { facilityId, facilityName } = useAuth();
  const [stock, setStock] = useState<BloodUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUnitTimeline, setSelectedUnitTimeline] = useState<{ unit: BloodUnit; timeline: any[] } | null>(null);
  const [filterComponent, setFilterComponent] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form State for Registering Unit
  const [formData, setFormData] = useState({
    component: "PLATELETS" as Component,
    bloodGroup: "O-" as BloodGroup,
    volumeMl: 250,
    hoursToExpiry: 36,
  });

  const loadStock = async () => {
    setLoading(true);
    try {
      const items = await api.getStock(facilityId);
      setStock(items);
    } catch (err) {
      console.error("Could not load stock:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [facilityId]);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("add");
    try {
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + formData.hoursToExpiry * 3600 * 1000
      ).toISOString();

      await api.createUnit(
        {
          facilityId,
          component: formData.component,
          bloodGroup: formData.bloodGroup,
          volumeMl: Number(formData.volumeMl),
          valueInr: 1500,
          collectedAt: now.toISOString(),
          expiresAt,
        },
        facilityId
      );

      setShowAddModal(false);
      await loadStock();
    } catch (err: any) {
      alert(`Error registering unit: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatch = async (unitId: string) => {
    setActionLoading(unitId);
    try {
      await api.markInTransit(unitId, facilityId, {
        note: "Dispatched with cold-chain box verified at +4.0°C",
        courier: "PulseChain Verified Medical Logistics",
      });
      alert(`Unit ${unitId} successfully dispatched! Status is now IN_TRANSIT.`);
      await loadStock();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewTimeline = async (unitId: string) => {
    try {
      const data = await api.getUnitById(unitId);
      setSelectedUnitTimeline(data);
    } catch (err: any) {
      alert(`Could not fetch unit details: ${err.message}`);
    }
  };

  const filteredStock = stock.filter((u) => {
    if (filterComponent !== "ALL" && u.component !== filterComponent) return false;
    if (searchQuery && !u.unitId.toLowerCase().includes(searchQuery.toLowerCase()) && !u.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalUnits = stock.length;
  const nearExpiryUnits = stock.filter((u) => u.status === "RESCUE_PENDING" || (new Date(u.expiresAt).getTime() - Date.now()) < 48 * 3600 * 1000).length;
  const inTransitUnits = stock.filter((u) => u.status === "IN_TRANSIT" || u.status === "CLAIMED").length;

  return (
    <div className="space-y-6">
      {/* Top Statistical KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Total Active Stock</div>
            <div className="text-2xl font-extrabold text-neutral-900 mt-1 font-mono tnum">{totalUnits} units</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{facilityName}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-crimson-200 shadow-sm flex items-center justify-between bg-crimson-50/30">
          <div>
            <div className="text-[11px] font-bold text-crimson-700 uppercase tracking-wider">Near Expiry (&lt; 48h)</div>
            <div className="text-2xl font-extrabold text-crimson-700 mt-1 font-mono tnum">{nearExpiryUnits} units</div>
            <div className="text-[11px] text-crimson-600 mt-0.5 font-medium">Automatic Rescue Active</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-crimson-100 flex items-center justify-center text-crimson-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Allocated / En Route</div>
            <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono tnum">{inTransitUnits} units</div>
            <div className="text-[11px] text-blue-600 mt-0.5">Claimed &amp; Dispatched</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cold-Chain Status</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono tnum">+4.1°C</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Optimal Range (+2° to +6°)</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Thermometer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Stock Table Container */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Table Controls Bar */}
        <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search unit ID or group (e.g. O-)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-crimson-600 w-60"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFilterComponent("ALL")}
                className={`px-3 py-1 rounded-md transition ${filterComponent === "ALL" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                All Components
              </button>
              <button
                onClick={() => setFilterComponent("PLATELETS")}
                className={`px-3 py-1 rounded-md transition ${filterComponent === "PLATELETS" ? "bg-white text-crimson-700 shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                Platelets (PLT)
              </button>
              <button
                onClick={() => setFilterComponent("RBC")}
                className={`px-3 py-1 rounded-md transition ${filterComponent === "RBC" ? "bg-white text-amber-700 shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                RBC
              </button>
              <button
                onClick={() => setFilterComponent("PLASMA")}
                className={`px-3 py-1 rounded-md transition ${filterComponent === "PLASMA" ? "bg-white text-teal-700 shadow-sm font-bold" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                Plasma
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadStock}
              disabled={loading}
              className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-crimson-700 hover:bg-crimson-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Log Blood Unit
            </button>
          </div>
        </div>

        {/* Stock Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-300 text-neutral-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Unit ID</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Time to Expiry</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredStock.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                    <p className="font-semibold text-neutral-600">No matching blood units in inventory</p>
                  </td>
                </tr>
              ) : (
                filteredStock.map((unit) => {
                  const isRescue = unit.status === "RESCUE_PENDING";
                  const isClaimed = unit.status === "CLAIMED";
                  const isInTransit = unit.status === "IN_TRANSIT";

                  return (
                    <tr
                      key={unit.unitId}
                      className={`hover:bg-neutral-50 transition ${isRescue ? "bg-crimson-50/40" : ""}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                        {unit.unitId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            unit.component === "PLATELETS"
                              ? "badge-plt"
                              : unit.component === "RBC"
                              ? "badge-rbc"
                              : "badge-plasma"
                          }`}
                        >
                          {unit.component}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-extrabold text-xs bg-neutral-900 text-white">
                          {unit.bloodGroup}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-700">
                        {unit.volumeMl} ml
                      </td>

                      <td className="py-3.5 px-4">
                        <CountdownBadge expiresAt={unit.expiresAt} />
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            unit.status === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                              : isRescue
                              ? "bg-crimson-100 text-crimson-900 border border-crimson-400 pulse-critical"
                              : isClaimed
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : isInTransit
                              ? "bg-sky-100 text-sky-900 border border-sky-300"
                              : unit.status === "RECEIVED"
                              ? "bg-teal-100 text-teal-900 border border-teal-300"
                              : "bg-neutral-200 text-neutral-700"
                          }`}
                        >
                          {unit.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewTimeline(unit.unitId)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold text-xs inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Audit
                        </button>

                        {isClaimed && (
                          <button
                            onClick={() => handleDispatch(unit.unitId)}
                            disabled={actionLoading === unit.unitId}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs inline-flex items-center gap-1 transition shadow-sm"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            {actionLoading === unit.unitId ? "Dispatching..." : "Dispatch"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Unit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl border border-neutral-300">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="text-base font-bold text-neutral-900">Log New Blood Unit</h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUnit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Component Type</label>
                <select
                  value={formData.component}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value as Component })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:ring-2 focus:ring-crimson-700"
                >
                  <option value="PLATELETS">Platelets (PLT - 5 Days Shelf Life)</option>
                  <option value="RBC">Red Blood Cells (RBC - 35 Days)</option>
                  <option value="PLASMA">Fresh Frozen Plasma (FFP - 1 Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-medium focus:ring-2 focus:ring-crimson-700 font-mono"
                >
                  <option value="O-">O Negative (Universal Donor)</option>
                  <option value="O+">O Positive</option>
                  <option value="A-">A Negative</option>
                  <option value="A+">A Positive</option>
                  <option value="B-">B Negative</option>
                  <option value="B+">B Positive</option>
                  <option value="AB-">AB Negative</option>
                  <option value="AB+">AB Positive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Volume (ml)</label>
                  <input
                    type="number"
                    value={formData.volumeMl}
                    onChange={(e) => setFormData({ ...formData, volumeMl: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-mono focus:ring-2 focus:ring-crimson-700"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Hours to Expiry</label>
                  <input
                    type="number"
                    value={formData.hoursToExpiry}
                    onChange={(e) => setFormData({ ...formData, hoursToExpiry: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 font-mono focus:ring-2 focus:ring-crimson-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "add"}
                  className="px-4 py-2 bg-crimson-700 hover:bg-crimson-800 text-white font-bold rounded-lg shadow-sm"
                >
                  {actionLoading === "add" ? "Saving..." : "Save to Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unit Audit Timeline */}
      {selectedUnitTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl border border-neutral-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Unit Audit Trail — {selectedUnitTimeline.unit.unitId}
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedUnitTimeline.unit.bloodGroup} {selectedUnitTimeline.unit.component} • Version {selectedUnitTimeline.unit.version}
                </p>
              </div>
              <button onClick={() => setSelectedUnitTimeline(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedUnitTimeline.timeline.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-6">No audit records found.</p>
              ) : (
                selectedUnitTimeline.timeline.map((evt, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-neutral-900">
                      <span className="font-mono text-crimson-700">{evt.eventType}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-neutral-600">Actor: <span className="font-mono text-neutral-800">{evt.actorFacilityId || "SYSTEM"}</span></div>
                    {evt.details && (
                      <pre className="text-[10px] font-mono bg-neutral-100 p-1.5 rounded overflow-x-auto text-neutral-700">
                        {JSON.stringify(evt.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
