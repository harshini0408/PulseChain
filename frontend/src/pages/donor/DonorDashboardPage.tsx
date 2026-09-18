import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Clock,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Users,
  Bell,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  PauseCircle,
  PlayCircle,
  MapPin,
  Phone,
} from "lucide-react";
import { api } from "../../api/client";
import type { Donor, DonorEligibility } from "@pulsechain/shared";

export function DonorDashboardPage() {
  const [donorId, setDonorId] = useState<string>(
    localStorage.getItem("pulsechain_donor_id") || "D-BOSCH-01"
  );
  const [donor, setDonor] = useState<Donor | null>(null);
  const [eligibility, setEligibility] = useState<DonorEligibility | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Self deferral modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseDurationDays, setPauseDurationDays] = useState(30);
  const [updatingPause, setUpdatingPause] = useState(false);

  const fetchDonorData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDonor(id);
      setDonor(res.donor);
      setEligibility(res.eligibility);

      // Fetch community details if affiliated
      if (res.donor.communityId) {
        try {
          const commRes = await api.getCommunity(res.donor.communityId);
          setCommunity(commRes.community);
        } catch {
          // community fetch might fail if scoped differently
        }
      } else {
        setCommunity(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load donor profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (donorId) {
      fetchDonorData(donorId);
    }
  }, [donorId]);

  const handlePauseToggle = async (pause: boolean) => {
    if (!donor) return;
    try {
      setUpdatingPause(true);
      let deferredUntil: string | null = null;
      if (pause) {
        const d = new Date();
        d.setDate(d.getDate() + pauseDurationDays);
        deferredUntil = d.toISOString();
      }

      const res = await api.deferDonor(donor.donorId, deferredUntil);
      setDonor(res.donor);
      setEligibility(res.eligibility);
      setShowPauseModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to update pause status");
    } finally {
      setUpdatingPause(false);
    }
  };

  if (loading && !donor) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-text-muted">Loading donor status...</p>
        </div>
      </div>
    );
  }

  const isEligible = eligibility?.isEligible ?? true;
  const daysRemaining = eligibility?.daysRemaining ?? 0;
  const isSelfDeferred = eligibility?.isSelfDeferred ?? false;
  const apheresisEligible = eligibility?.apheresisEligible ?? true;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white font-extrabold text-2xl shadow-lg shadow-accent/25">
            {donor?.bloodGroup || "O+"}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface border-2 border-surface text-accent">
              <Heart className="h-3 w-3 fill-accent" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">{donor?.name || "Corridor Donor"}</h1>
              <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-mono font-medium text-text-muted border border-border">
                {donor?.donorId}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <span>{donor?.city || "Coimbatore Corridor"}</span>
              <span>•</span>
              <span>Verified Donations: {donor?.verifiedDonations || 0}</span>
            </p>
          </div>
        </div>

        {/* Quick Demo Donor Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline">Demo donor:</span>
          <select
            value={donorId}
            onChange={(e) => {
              setDonorId(e.target.value);
              localStorage.setItem("pulsechain_donor_id", e.target.value);
            }}
            className="rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="D-BOSCH-01">D-BOSCH-01 (Eligible B+)</option>
            <option value="D-KCT-01">D-KCT-01 (Eligible O+)</option>
            <option value="D-PSG-01">D-PSG-01 (Eligible A+)</option>
            <option value="D-BOSCH-03">D-BOSCH-03 (Recent / Ineligible)</option>
            <option value="D-KCT-04">D-KCT-04 (Self-Deferred)</option>
            {localStorage.getItem("pulsechain_donor_id") &&
              !["D-BOSCH-01", "D-KCT-01", "D-PSG-01", "D-BOSCH-03", "D-KCT-04"].includes(
                localStorage.getItem("pulsechain_donor_id")!
              ) && (
                <option value={localStorage.getItem("pulsechain_donor_id")!}>
                  {localStorage.getItem("pulsechain_donor_id")} (You)
                </option>
              )}
          </select>
        </div>
      </div>

      {/* Hero Countdown / Eligibility Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all shadow-md ${
          isSelfDeferred
            ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
            : isEligible
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-surface to-surface text-text"
            : "border-blue-500/30 bg-gradient-to-br from-blue-950/30 via-surface to-surface text-text"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              {isSelfDeferred ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 text-amber-300 px-3 py-1 text-xs font-semibold border border-amber-500/30">
                  <PauseCircle className="h-4 w-4" /> Voluntary Pause Active
                </span>
              ) : isEligible ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-semibold border border-emerald-500/30">
                  <CheckCircle2 className="h-4 w-4 animate-pulse" /> Ready & Eligible to Donate
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 text-blue-400 px-3 py-1 text-xs font-semibold border border-blue-500/30">
                  <Clock className="h-4 w-4" /> Standard Interval Recovery
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isSelfDeferred
                ? "Notifications Paused"
                : isEligible
                ? "You are eligible to save lives today."
                : `${daysRemaining} days until Whole Blood donation`}
            </h2>

            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {isSelfDeferred
                ? `You paused alerts until ${
                    eligibility?.selfDeferredUntil
                      ? new Date(eligibility.selfDeferredUntil).toLocaleDateString()
                      : "reactivated"
                  }. Take your time—you can resume notifications anytime.`
                : isEligible
                ? "Your biological recovery clock has fully elapsed. PulseChain will only ping you when institutional stocks fail."
                : `Last donation was registered on ${
                    donor?.lastDonationAt ? new Date(donor.lastDonationAt).toLocaleDateString() : "record"
                  }. Next eligible date for whole blood: ${
                    eligibility?.nextEligibleAt
                      ? new Date(eligibility.nextEligibleAt).toLocaleDateString()
                      : "soon"
                  }.`}
            </p>
          </div>

          {/* Action Button: Pause or Reactivate */}
          <div>
            {isSelfDeferred ? (
              <button
                onClick={() => handlePauseToggle(false)}
                disabled={updatingPause}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 text-black px-5 py-3 font-bold text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                <PlayCircle className="h-5 w-5" />
                <span>{updatingPause ? "Resuming..." : "Resume Alerts"}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowPauseModal(true)}
                className="flex items-center gap-2 rounded-2xl border border-border bg-surface-raised hover:border-text-muted px-4 py-2.5 text-xs font-semibold text-text transition-all"
              >
                <PauseCircle className="h-4 w-4 text-text-muted" />
                <span>Pause Notifications</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Interval Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-raised/60 border border-border">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">
                Whole Blood (90-Day Standard)
              </span>
              <p className="text-sm font-bold text-text">
                {isEligible ? "Fully Eligible" : `${daysRemaining} days remaining`}
              </p>
            </div>
            <span
              className={`h-3 w-3 rounded-full ${
                isEligible ? "bg-emerald-400" : "bg-blue-400"
              }`}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-raised/60 border border-border">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase text-text-muted">
                Platelets / Apheresis (14-Day Standard)
              </span>
              <p className="text-sm font-bold text-text">
                {apheresisEligible
                  ? "Available for Urgent Needs"
                  : `${eligibility?.apheresisDaysRemaining ?? 0} days remaining`}
              </p>
            </div>
            <span
              className={`h-3 w-3 rounded-full ${
                apheresisEligible ? "bg-emerald-400" : "bg-blue-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Community Affiliation Card */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold text-text">Corridor Community Affiliation</h3>
          </div>
          {community && (
            <span className="rounded-full bg-accent/10 text-accent border border-accent/20 px-3 py-0.5 text-xs font-semibold">
              Code: {community.joinCode}
            </span>
          )}
        </div>

        {community ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text">{community.name}</h4>
              <p className="text-xs text-text-muted">
                Coordinator: <span className="text-text font-medium">{community.coordinatorName}</span>
              </p>
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-accent" />
                <span>{community.coordinatorContact}</span>
              </p>
            </div>
            <div className="text-xs text-text-muted max-w-xs text-right hidden sm:block">
              Your coordinator arranges escorts and rapid transit when corridor requisitions escalate.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
            <p className="text-xs text-text-muted">
              You are currently registered as an independent donor. Join a college or corporate corridor for coordinated transit!
            </p>
            <Link
              to="/donor/register"
              className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
            >
              <span>Affiliate with a community</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Network Alerting Policy & Privacy Info */}
      <div className="rounded-3xl border border-border bg-surface-raised/40 p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text">
          <Info className="h-4 w-4 text-accent" />
          <span>How PulseChain Community Alerts Work</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          PulseChain is built on an expiry-prevention engine. Hospitals share near-expiry units first across Tier 1 (5 km) and Tier 2 (25 km). You are only alerted when institutional blood banks are completely out of compatible blood units, preventing unnecessary requests.
        </p>
      </div>

      {/* Pause / Self-Deferral Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <PauseCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Voluntary Pause</h3>
                <p className="text-xs text-text-muted">No questions asked. Pause alerts anytime.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-text-muted">
                Select Pause Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { days: 14, label: "2 Weeks" },
                  { days: 30, label: "1 Month" },
                  { days: 90, label: "3 Months" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setPauseDurationDays(item.days)}
                    className={`h-11 rounded-xl font-semibold text-xs border transition-all ${
                      pauseDurationDays === item.days
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                        : "bg-surface-raised border-border text-text hover:border-text-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Your profile will be temporarily excluded from matching until the pause expires, or until you click &quot;Resume Alerts&quot;.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePauseToggle(true)}
                disabled={updatingPause}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20"
              >
                {updatingPause ? "Pausing..." : `Pause for ${pauseDurationDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
