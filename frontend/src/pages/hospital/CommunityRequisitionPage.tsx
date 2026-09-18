import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  AlertCircle,
  Clock,
  Send,
  Heart,
  ShieldCheck,
  Building,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../api/client";
import {
  BLOOD_GROUPS,
  COMPONENTS,
  type BloodGroup,
  type Component,
  type Urgency,
} from "@pulsechain/shared";

export function CommunityRequisitionPage() {
  const navigate = useNavigate();

  const [hospitalId, setHospitalId] = useState("FAC-CMCH");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>("B+");
  const [component, setComponent] = useState<Component>("PLATELETS");
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [urgency, setUrgency] = useState<Urgency>("HIGH");
  const [neededInHours, setNeededInHours] = useState(4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      setLoading(true);
      const neededBy = new Date(Date.now() + neededInHours * 3600 * 1000).toISOString();

      await api.createRequisition(
        {
          hospitalId,
          component,
          bloodGroup,
          unitsRequested: Number(unitsNeeded),
          urgency,
          neededBy,
          source: "COMMUNITY",
        }
      );

      setSuccessMsg("Community requisition registered successfully! Entering donor escalation fallback.");
      setTimeout(() => {
        navigate("/hospital/requisitions");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create community requisition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20">
          <Users className="h-6 w-6 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Community-Backed Blood Requisition
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-md mx-auto">
          Requisitions tagged with community source prioritize corridor donors and NSS community clusters if hospital stocks fail.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Requesting Facility */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Requesting Hospital
            </label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="FAC-CMCH">Coimbatore Medical College Hospital (FAC-CMCH)</option>
              <option value="FAC-PSG-HOSP">PSG Hospitals (FAC-PSG-HOSP)</option>
              <option value="FAC-KMCH">KMCH Blood Centre (FAC-KMCH)</option>
              <option value="FAC-GKNM">GKNM Hospital (FAC-GKNM)</option>
            </select>
          </div>

          {/* Blood Group Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Required Blood Group
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bg)}
                  className={`h-10 rounded-xl font-bold text-xs transition-all border ${
                    bloodGroup === bg
                      ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                      : "bg-surface-raised text-text border-border hover:border-text-muted"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Component & Units Needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Component
              </label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value as Component)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {COMPONENTS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Units Needed
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          {/* Urgency & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Urgency Tier
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="CRITICAL">CRITICAL (Immediate)</option>
                <option value="HIGH">HIGH (&lt; 6 hours)</option>
                <option value="NORMAL">NORMAL (&lt; 24 hours)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Required Within (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                required
                value={neededInHours}
                onChange={(e) => setNeededInHours(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{loading ? "Registering Requisition..." : "Submit Community Requisition"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
