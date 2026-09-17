import React, { useState, useEffect } from "react";
import {
  Inbox,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  PackageCheck,
  Building2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { Offer } from "@pulsechain/shared";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/context.js";
import { CountdownBadge } from "../../components/CountdownBadge.js";
import { MatchReasonModal } from "../../components/MatchReasonModal.js";

export const InboxPage: React.FC = () => {
  const { facilityId, facilityName } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<Offer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadInbox = async () => {
    setLoading(true);
    try {
      const items = await api.getInbox(facilityId);
      setOffers(items);
    } catch (err) {
      console.error("Could not load inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 5000);
    return () => clearInterval(interval);
  }, [facilityId]);

  const handleClaim = async (offer: Offer) => {
    setActionLoading(offer.offerId);
    try {
      await api.claimOffer(offer.offerId, {
        unitId: offer.unitId,
        escalationId: offer.escalationId,
        ring: offer.ring,
        recipientFacilityId: facilityId,
      });
      alert(`Success! Unit ${offer.unitId} locked and claimed by ${facilityId}.`);
      await loadInbox();
    } catch (err: any) {
      alert(`Claim Conflict: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (offer: Offer) => {
    setActionLoading(offer.offerId);
    try {
      await api.declineOffer(offer.offerId, {
        unitId: offer.unitId,
        escalationId: offer.escalationId,
        ring: offer.ring,
        recipientFacilityId: facilityId,
        reason: "Hospital currently at maximum blood storage capacity",
      });
      await loadInbox();
    } catch (err: any) {
      alert(`Decline error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReceive = async (unitId: string) => {
    setActionLoading(unitId);
    try {
      await api.markReceived(unitId, facilityId, {
        verifiedBy: "Blood Bank Officer",
        conditionOk: true,
      });
      alert(`Unit ${unitId} successfully RECEIVED and added to hospital stock! Impact metrics incremented.`);
      await loadInbox();
    } catch (err: any) {
      alert(`Receipt error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openOffers = offers.filter((o) => o.status === "OPEN");
  const claimedOffers = offers.filter((o) => o.status === "CLAIMED");

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-neutral-900">Hospital Redistribution Inbox</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-crimson-100 text-crimson-800 font-mono font-bold">
              {facilityId}
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            {facilityName} • Time-limited allocation offers matched deterministically from regional blood centers
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadInbox}
            disabled={loading}
            className="px-3.5 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Inbox
          </button>
        </div>
      </div>

      {/* Offers List */}
      {offers.length === 0 && !loading ? (
        <div className="bg-white rounded-xl p-12 text-center border border-neutral-200 shadow-sm">
          <Inbox className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-700">No Incoming Redistribution Offers</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            When blood centres have near-expiry components matching your hospital's blood group and demand profile, timed offers will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const isOpen = offer.status === "OPEN";
            const isClaimed = offer.status === "CLAIMED";
            const distKm = offer.breakdown?.distanceKm || 8.4;

            return (
              <div
                key={offer.offerId}
                className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${
                  isOpen
                    ? "border-crimson-400 bg-crimson-50/20"
                    : isClaimed
                    ? "border-blue-300 bg-blue-50/20"
                    : "border-neutral-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Match Details */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-crimson-700 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Rank</span>
                      <span className="text-sm font-extrabold leading-none">#{offer.rank}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-neutral-900 font-mono">
                          Unit: {offer.unitId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono">
                          Ring {offer.ring} ({distKm.toFixed(1)} km)
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-crimson-100 text-crimson-800 border border-crimson-300"
                              : isClaimed
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      <p className="text-xs text-crimson-900 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-crimson-600 flex-shrink-0" />
                        {offer.reason || "High compatibility and active open demand"}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 pt-1">
                        <span>Origin: <strong className="text-neutral-700 font-mono">{offer.originFacilityId}</strong></span>
                        <span>Deterministic Score: <strong className="text-neutral-900 font-mono">{(offer.score * 100).toFixed(0)}/100</strong></span>
                        <button
                          onClick={() => setSelectedOfferForModal(offer)}
                          className="text-crimson-700 hover:text-crimson-800 font-semibold underline flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          Why was this matched?
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions & Timers */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                    {isOpen && (
                      <div className="flex items-center space-x-2">
                        <div className="text-right mr-2">
                          <span className="text-[10px] font-semibold text-neutral-500 block uppercase">Claim Window</span>
                          <CountdownBadge expiresAt={offer.claimBy} />
                        </div>

                        <button
                          onClick={() => handleClaim(offer)}
                          disabled={actionLoading === offer.offerId}
                          className="px-4 py-2 bg-crimson-700 hover:bg-crimson-800 text-white rounded-lg text-xs font-bold shadow-md shadow-crimson-900/30 flex items-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading === offer.offerId ? "Claiming..." : "CLAIM OFFER"}
                        </button>

                        <button
                          onClick={() => handleDecline(offer)}
                          disabled={actionLoading === offer.offerId}
                          className="px-3 py-2 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}

                    {isClaimed && (
                      <button
                        onClick={() => handleReceive(offer.unitId)}
                        disabled={actionLoading === offer.unitId}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition"
                      >
                        <PackageCheck className="w-4 h-4" />
                        {actionLoading === offer.unitId ? "Confirming..." : "Confirm Unit Received"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Breakdown Modal */}
      <MatchReasonModal
        offer={selectedOfferForModal}
        onClose={() => setSelectedOfferForModal(null)}
      />
    </div>
  );
};
