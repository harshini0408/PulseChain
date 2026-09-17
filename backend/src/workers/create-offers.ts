import {
  getConfig,
  isoNow,
  offerInboxGsi2,
  offerKey,
  unitKey,
  type BloodUnit,
  type Offer,
  type RankedCandidate,
  type WithKeys,
} from "@pulsechain/shared";
import { getItem, putItem } from "../lib/db.js";
import { sendOfferNotification } from "../lib/ses.js";
import { writeAuditEvent } from "../lib/audit.js";

export interface CreateOffersInput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId: string;
  candidates: RankedCandidate[];
}

export interface CreateOffersOutput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId: string;
  offerIds: string[];
  offerCount: number;
  offerWindowSeconds: number;
}

export async function handler(event: CreateOffersInput): Promise<CreateOffersOutput> {
  const { unitId, ring, escalationId, candidates } = event;
  const config = getConfig();
  const now = isoNow();
  const claimByDate = new Date(Date.now() + config.offerWindowSeconds * 1000).toISOString();

  const unitKeys = unitKey(unitId);
  const unit = await getItem<BloodUnit>(unitKeys.PK, unitKeys.SK);

  if (!unit) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  const offerIds: string[] = [];

  for (const candidate of candidates) {
    const toFacId = candidate.facility.facilityId;
    const offerId = `OFFER-${unitId}-${ring}-${toFacId}`;
    const keys = offerKey(unitId, escalationId, ring, toFacId);
    const gsi2 = offerInboxGsi2(toFacId, now);

    const offer: Offer = {
      offerId,
      escalationId,
      ring,
      unitId,
      originFacilityId: unit.facilityId,
      recipientFacilityId: toFacId,
      status: "OPEN",
      createdAt: now,
      claimBy: claimByDate,
      rank: candidate.rank,
      score: candidate.score,
      breakdown: candidate.breakdown,
      reason: candidate.reason,
      requisitionId: candidate.requisition?.reqId,
    };

    const dbItem: WithKeys<Offer> & Offer = {
      ...keys,
      ...gsi2,
      entityType: "Offer",
      ...offer,
    };

    await putItem(dbItem);
    offerIds.push(offerId);

    // Write audit event
    await writeAuditEvent({
      eventType: "OFFER_CREATED",
      subjectType: "UNIT",
      subjectId: unitId,
      actorFacilityId: toFacId,
      details: {
        offerId,
        ring,
        rank: candidate.rank,
        score: candidate.score,
        claimBy: claimByDate,
        reason: candidate.reason,
      },
    });

    // Send SES notification
    if (candidate.facility.contactEmail) {
      await sendOfferNotification({
        toEmail: candidate.facility.contactEmail,
        facility: candidate.facility,
        unit,
        offer,
      });
    }
  }

  return {
    unitId,
    ring,
    escalationId,
    offerIds,
    offerCount: offerIds.length,
    offerWindowSeconds: config.offerWindowSeconds,
  };
}
