import React, { useState } from "react";
import type { Offer } from "@pulsechain/shared";
import { useClaimMutation, useDeclineMutation } from "../../api/hooks";
import { useCountdown } from "../../lib/countdown";
import { CountdownRing } from "./CountdownRing";
import { MatchBreakdown } from "./MatchBreakdown";
import { ClaimButton } from "./ClaimButton";
import {
  Sparkles,
  MapPin,
  Building2,
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle,
} from "lucide-react";

interface OfferCardProps {
  offer: Offer;
  facilityNames?: Record<string, string>;
}

const KNOWN_FACILITIES: Record<string, string> = {
  FAC_CBE_SNBC: "Coimbatore SNS Blood Centre",
  FAC_CBE_KMCH: "Kovai Medical Centre and Hospital",
  FAC_CBE_GKNM: "G. Kuppuswamy Naidu Memorial Hospital",
  FAC_CBE_PSG: "PSG Hospitals, Peelamedu",
  FAC_CBE_RAMA: "Sri Ramakrishna Hospital",
  FAC_CBE_ROYAL: "Royal Care Super Speciality Hospital",
};

export const OfferCard: React.FC<OfferCardProps> = ({ offer, facilityNames }) => {
  const claimMutation = useClaimMutation();
  const declineMutation = useDeclineMutation();

  const [conflictError, setConflictError] = useState<string | null>(null);
  const [declinedLocally, setDeclinedLocally] = useState(false);

  const countdown = useCountdown(offer.claimBy);
  const isExpired = countdown.isExpired;

  const originName =
    facilityNames?.[offer.originFacilityId] ??
    KNOWN_FACILITIES[offer.originFacilityId] ??
    offer.originFacilityId;

  // RhD caveat if compatibility is ACCEPTABLE (< 1.0) or noted in reason
  const isEmergencyCompatible =
    (offer.breakdown?.compatibility > 0 && offer.breakdown?.compatibility < 1.0) ||
    offer.reason.toLowerCase().includes("acceptable") ||
    offer.reason.toLowerCase().includes("rhd");

  const handleClaim = async () => {
    setConflictError(null);
    try {
      await claimMutation.mutateAsync(offer.offerId);
    } catch (err: any) {
      // 409 Double-claim collision or other rejection
      const msg = err.message || "Already claimed by another facility";
      setConflictError(msg);
    }
  };

  const handleDecline = async () => {
    try {
      await declineMutation.mutateAsync({ offerId: offer.offerId });
      setDeclinedLocally(true);
    } catch (err: any) {
      console.error("Decline error:", err);
    }
  };

  const isClaimed = offer.status === "CLAIMED";
  const isDeclined = offer.status === "DECLINED" || declinedLocally;
  const isSuperseded = offer.status === "SUPERSEDED";

  // Dimming conditions
  const isDimmed = isExpired || isDeclined || isSuperseded;

  return (
    <div
      className={`rounded-xl border transition-all shadow-sm ${
        conflictError
          ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20"
          : isClaimed
          ? "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20"
          : isDimmed
          ? "opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
      } p-5`}
    >
      {/* Top Header: Badge, Origin, and Countdown */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs">
            {offer.bloodGroup ?? "O+"}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{offer.component ?? "PLATELETS"}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({offer.volumeMl ?? 250} ml)
              </span>
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">{originName}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{offer.breakdown?.distanceKm?.toFixed(1) ?? "1.0"} km away</span>
            </div>
          </div>
        </div>

        {/* Claim Window Timer */}
        <div className="flex items-center gap-2">
          {offer.status === "OPEN" && !conflictError && (
            <CountdownRing claimBy={offer.claimBy} />
          )}
          {isClaimed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle className="w-3.5 h-3.5" />
              CLAIMED
            </span>
          )}
          {isDeclined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              DECLINED
            </span>
          )}
          {isSuperseded && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              SUPERSEDED
            </span>
          )}
        </div>
      </div>

      {/* The Why: Prominent Justification Reason */}
      <div className="mt-3.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Rescue Match Reason
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed font-medium">
              {offer.reason}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency RhD Protocol Warning if applicable */}
      {isEmergencyCompatible && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="font-medium">
            Compatible under emergency protocol (RhD mismatch — requires clinician signoff)
          </span>
        </div>
      )}

      {/* Verified Stored Factor Breakdown */}
      {offer.breakdown && (
        <MatchBreakdown score={offer.score} breakdown={offer.breakdown} />
      )}

      {/* Action Footer: Claim / Decline or 409 Double-Claim Presentation */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-slate-400">
          Unit #{offer.unitId} • Ring {offer.ring}
        </span>

        {/* 409 Conflict State Presentation */}
        {conflictError ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Offer Invalidated: </span>
              <span>{conflictError}</span>
            </div>
          </div>
        ) : offer.status === "OPEN" && !isDimmed ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={declineMutation.isPending || claimMutation.isPending}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Decline
            </button>
            <ClaimButton
              onClick={handleClaim}
              isLoading={claimMutation.isPending}
              disabled={isExpired}
            />
          </div>
        ) : isExpired && offer.status === "OPEN" ? (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">
            Claim window closed — unit escalated to next ring
          </span>
        ) : null}
      </div>
    </div>
  );
};
