import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  RefreshCw,
  Copy,
  AlertTriangle,
  PlusCircle,
  Share2,
  Calendar,
  Heart,
  ChevronRight,
} from "lucide-react";
import { api } from "../../api/client";
import { CommunityRadarMap } from "../../components/community/CommunityRadarMap";
import type { Community, CommunityAlert, BloodGroup } from "@pulsechain/shared";

const SEEDED_COMMUNITIES = [
  { id: "COMM-BOSCH", label: "Bosch CSR Division (COMM-BOSCH)" },
  { id: "COMM-PSG-ITECH", label: "PSG iTech NSS Unit (COMM-PSG-ITECH)" },
  { id: "COMM-KCT", label: "Kumaraguru Blood Donors Club (COMM-KCT)" },
  { id: "COMM-AMRITA", label: "Amrita Vishwa Vidyapeetham (COMM-AMRITA)" },
  { id: "COMM-RAHEJA", label: "Mindspace IT Park CSR (COMM-RAHEJA)" },
  { id: "COMM-MAYFLOWER", label: "Mayflower Valley RWA (COMM-MAYFLOWER)" },
  { id: "COMM-TEA-TUP", label: "Tiruppur Exporters Association (COMM-TEA-TUP)" },
];

export function CommunityConsolePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [communityId, setCommunityId] = useState<string>(
    id || localStorage.getItem("pulsechain_community_id") || "COMM-BOSCH"
  );
  const [data, setData] = useState<{
    community: Community;
    members: any[];
    alerts: CommunityAlert[];
    stats: {
      totalMembers: number;
      eligibleNowCount: number;
      activeAlerts: number;
      totalMobilised: number;
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Mobilize modal state
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert | null>(null);
  const [mobilizedCount, setMobilizedCount] = useState(2);
  const [respondingAlert, setRespondingAlert] = useState(false);

  // Record donation modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState("");
  const [recordingFacilityId, setRecordingFacilityId] = useState("FAC-CMCH");
  const [recordingDonation, setRecordingDonation] = useState(false);

  const fetchCommunityData = async (cid: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCommunity(cid, cid);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load community console");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communityId) {
      fetchCommunityData(communityId);
    }
  }, [communityId]);

  const handleSelectCommunity = (newId: string) => {
    setCommunityId(newId);
    localStorage.setItem("pulsechain_community_id", newId);
    navigate(`/community/${newId}`, { replace: true });
  };

  const copyShareLink = () => {
    if (!data?.community) return;
    const shareUrl = `${window.location.origin}/donor/register?code=${data.community.joinCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMobilizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !data) return;

    try {
      setRespondingAlert(true);
      await api.respondToAlert(data.community.communityId, selectedAlert.alertId, {
        mobilisedCount: Number(mobilizedCount),
      });
      setSelectedAlert(null);
      await fetchCommunityData(data.community.communityId);
    } catch (err: any) {
      alert(err.message || "Failed to submit mobilization");
    } finally {
      setRespondingAlert(false);
    }
  };

  const handleRecordDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorId || !data) return;

    try {
      setRecordingDonation(true);
      await api.confirmDonation(data.community.communityId, {
        donorId: selectedDonorId,
        facilityId: recordingFacilityId,
        donationDate: new Date().toISOString(),
      });
      setShowRecordModal(false);
      setSelectedDonorId("");
      await fetchCommunityData(data.community.communityId);
    } catch (err: any) {
      alert(err.message || "Failed to record donation");
    } finally {
      setRecordingDonation(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-text-muted">Loading coordinator console...</p>
        </div>
      </div>
    );
  }

  const community = data?.community;
  const members = data?.members || [];
  const alerts = data?.alerts || [];
  const stats = data?.stats || {
    totalMembers: 0,
    eligibleNowCount: 0,
    activeAlerts: 0,
    totalMobilised: 0,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">{community?.name || "Community Console"}</h1>
              <span className="rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-accent">
                {community?.joinCode}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 flex items-center gap-2">
              <span>Coordinator: {community?.coordinatorName}</span>
              <span>•</span>
              <Phone className="h-3 w-3 inline text-accent" />
              <span>{community?.coordinatorContact}</span>
            </p>
          </div>
        </div>

        {/* Community Switcher & Share Code */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-text hover:border-text-muted transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-text-muted" />
                <span>Invite Donors</span>
              </>
            )}
          </button>

          <select
            value={communityId}
            onChange={(e) => handleSelectCommunity(e.target.value)}
            className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {SEEDED_COMMUNITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Total Roster</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-text">{stats.totalMembers}</span>
            <Users className="h-5 w-5 text-accent/70" />
          </div>
          <p className="text-[11px] text-text-muted">Registered in this corridor</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Eligible Today</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">{stats.eligibleNowCount}</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-[11px] text-text-muted">Interval clock ready</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Active Tier 3 Alerts</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-amber-400">{stats.activeAlerts}</span>
            <Bell className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-[11px] text-text-muted">Hospitals in need</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Mobilized Donors</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-text">{stats.totalMobilised}</span>
            <Heart className="h-5 w-5 text-accent" />
          </div>
          <p className="text-[11px] text-text-muted">Confirmed response dispatch</p>
        </div>
      </div>

      {/* Main Grid: Radar Map & Active Requisition Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Map Card */}
        <div className="lg:col-span-5 flex flex-col">
          <CommunityRadarMap
            center={{
              name: "Coimbatore Medical College Hospital",
              lat: 11.0028,
              lng: 76.9806,
            }}
            communities={SEEDED_COMMUNITIES.map((c) => ({
              id: c.id,
              name: c.label.split(" (")[0],
              lat: 11.0168 + (Math.random() - 0.5) * 0.15,
              lng: 76.9558 + (Math.random() - 0.5) * 0.15,
              memberCount: c.id === communityId ? members.length : 25,
            }))}
            selectedCommunityId={communityId}
            onSelectCommunity={(comm) => handleSelectCommunity(comm.id)}
          />
        </div>

        {/* Active Emergency Fallback Alerts */}
        <div className="lg:col-span-7 rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-text">Tier-3 Emergency Fallback Alerts</h2>
            </div>
            <span className="text-xs text-text-muted">Only triggered when hospital stocks fail</span>
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/80" />
              <p className="text-sm font-semibold text-text">No Emergency Fallback Alerts</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Hospital blood banks are currently managing inventory through Tier 1 & 2 redistribution. Your community is on standby.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 transition-all hover:border-amber-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-amber-500/20 text-amber-300 font-extrabold text-sm px-2 py-0.5 border border-amber-500/30">
                          {alert.bloodGroup} {alert.component}
                        </span>
                        <span className="font-semibold text-sm text-text">
                          {alert.hospitalName}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        Reason: {alert.reason}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400">
                        {alert.unitsNeeded} units needed
                      </span>
                      <p className="text-[11px] text-text-muted">
                        Rank #{alert.rank} (Score: {Math.round(alert.score * 100)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                    <span className="text-text-muted">
                      Status:{" "}
                      <span className="font-semibold text-text">
                        {alert.status === "MOBILISED" || alert.status === "ACKNOWLEDGED"
                          ? `Responded (${alert.mobilisedCount || 0} donors sent)`
                          : "Awaiting Coordinator Response"}
                      </span>
                    </span>

                    {alert.status === "OPEN" && (
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setMobilizedCount(Math.min(alert.unitsNeeded, 3));
                        }}
                        className="rounded-xl bg-accent text-white px-3.5 py-1.5 font-semibold text-xs hover:bg-accent/90 transition-all shadow-md shadow-accent/20"
                      >
                        Mobilize Donors
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Community Member Roster */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">Community Roster & Live Eligibility</h2>
            <p className="text-xs text-text-muted">
              Live interval computation. No medical or health records stored.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecordModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-text hover:border-text-muted transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Record Facility Donation</span>
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised border-b border-border text-text-muted uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Donor</th>
                <th className="px-4 py-3 font-semibold">Group</th>
                <th className="px-4 py-3 font-semibold">Eligibility Status</th>
                <th className="px-4 py-3 font-semibold">Contact Via</th>
                <th className="px-4 py-3 font-semibold">Last Donation</th>
                <th className="px-4 py-3 font-semibold">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                    No members registered under this community join code yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isEligible = m.eligibility?.isEligible;
                  const isSelfDeferred = m.eligibility?.isSelfDeferred;
                  const daysRemaining = m.eligibility?.daysRemaining ?? 0;

                  return (
                    <tr key={m.donorId} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-text">
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          <span className="text-[10px] text-text-muted font-mono">{m.donorId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-surface-raised border border-border px-2 py-0.5 font-bold font-mono text-text">
                          {m.bloodGroup}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSelfDeferred ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium">
                            Paused
                          </span>
                        ) : isEligible ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Eligible Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[11px] font-medium">
                            <Clock className="h-3 w-3" /> {daysRemaining}d remaining
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <div className="flex flex-col">
                          <span className="font-medium text-text">{m.contactVia}</span>
                          {m.phone && <span className="text-[10px] font-mono">{m.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {m.lastDonationAt
                          ? new Date(m.lastDonationAt).toLocaleDateString()
                          : "First-time"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-text">
                        {m.verifiedDonations}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobilize Action Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Mobilize Community Donors</h3>
                <p className="text-xs text-text-muted">
                  Responding to {selectedAlert.hospitalName}
                </p>
              </div>
            </div>

            <form onSubmit={handleMobilizeSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-surface-raised border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Blood Group:</span>
                  <span className="font-bold text-text">{selectedAlert.bloodGroup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Requested Units:</span>
                  <span className="font-bold text-text">{selectedAlert.unitsNeeded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Eligible in your roster:</span>
                  <span className="font-bold text-emerald-400">
                    {
                      members.filter(
                        (m) =>
                          m.bloodGroup === selectedAlert.bloodGroup &&
                          m.eligibility?.isEligible
                      ).length
                    }{" "}
                    donors
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-text-muted">
                  Number of Donors Being Mobilized
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={mobilizedCount}
                  onChange={(e) => setMobilizedCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                Submitting will record response dispatch in the audit ledger and notify the requesting hospital.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={respondingAlert}
                  className="px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 shadow-md shadow-accent/20 disabled:opacity-50"
                >
                  {respondingAlert ? "Submitting..." : "Confirm Mobilization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Donation Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Record Facility Donation</h3>
                <p className="text-xs text-text-muted">
                  Facility-verified donation updates interval clocks.
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordDonationSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-text-muted">
                  Select Donor
                </label>
                <select
                  required
                  value={selectedDonorId}
                  onChange={(e) => setSelectedDonorId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.donorId} value={m.donorId}>
                      {m.name} ({m.bloodGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-text-muted">
                  Blood Bank / Hospital
                </label>
                <select
                  value={recordingFacilityId}
                  onChange={(e) => setRecordingFacilityId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="FAC-CMCH">Coimbatore Medical College Hospital (FAC-CMCH)</option>
                  <option value="FAC-PSG-HOSP">PSG Hospitals (FAC-PSG-HOSP)</option>
                  <option value="FAC-KMCH">KMCH Blood Centre (FAC-KMCH)</option>
                  <option value="FAC-GKNM">G. Kuppuswamy Naidu Memorial Hospital (FAC-GKNM)</option>
                </select>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                Recording donation restarts the donor&apos;s 90-day safe whole-blood interval and increments their verified donations tally in the registry.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingDonation || !selectedDonorId}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {recordingDonation ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
