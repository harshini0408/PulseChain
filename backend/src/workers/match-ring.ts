import {
  getConfig,
  rankCandidates,
  ringRange,
  unitKey,
  facilityKey,
  demandKey,
  reqsPartition,
  type BloodUnit,
  type Facility,
  type StandingDemand,
  type Requisition,
  type Candidate,
  type RankedCandidate,
} from "@pulsechain/shared";
import { getItem as dbGetItem, queryAll as dbQueryAll } from "../lib/db.js";

export interface MatchRingInput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId?: string;
}

export interface MatchRingOutput {
  unitId: string;
  ring: 1 | 2 | 3;
  escalationId: string;
  candidates: RankedCandidate[];
  hasCandidates: boolean;
}

export async function handler(event: MatchRingInput): Promise<MatchRingOutput> {
  const { unitId, ring } = event;
  const escalationId = event.escalationId || `ESC-${unitId}-${ring}`;

  const unitKeys = unitKey(unitId);
  const unit = await dbGetItem<BloodUnit>(unitKeys.PK, unitKeys.SK);

  if (!unit) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  const config = getConfig();
  const ringConfig = config.rings.find((r) => r.ring === ring) ?? {
    ring: 1 as const,
    minKm: 0,
    maxKm: 10,
  };

  const { from, to } = ringRange(ringConfig.minKm, ringConfig.maxKm);

  // 1. Query distance pairs for origin facility
  const distItems = await dbQueryAll<Record<string, any>>({
    keyCondition: "PK = :pk AND SK BETWEEN :from AND :to",
    values: {
      ":pk": `FACILITY#${unit.facilityId}`,
      ":from": from,
      ":to": to,
    },
  });

  const rawCandidates: Candidate[] = [];

  // 2. Fetch profiles, demand, and requisitions for each destination facility
  for (const distItem of distItems) {
    const parts = distItem.SK.split("#");
    const toFacId = parts[2];
    const distanceKm = distItem.distanceKm ?? parseFloat(parts[1]) ?? 5.0;

    if (!toFacId || toFacId === unit.facilityId) continue;

    // Facility profile
    const facKey = facilityKey(toFacId);
    const facility = await dbGetItem<Facility>(facKey.PK, facKey.SK);
    if (!facility) continue;

    // Standing demand
    const demKey = demandKey(toFacId, unit.component, unit.bloodGroup);
    const demand = await dbGetItem<StandingDemand>(demKey.PK, demKey.SK);

    // Open requisitions for facility
    const reqItems = await dbQueryAll<Requisition & Record<string, any>>({
      indexName: "GSI2",
      keyCondition: "GSI2PK = :pk",
      values: {
        ":pk": reqsPartition(toFacId),
      },
    });

    const openReq = reqItems.find(
      (r) =>
        r.status === "OPEN" &&
        r.component === unit.component &&
        r.bloodGroup === unit.bloodGroup
    );

    rawCandidates.push({
      facility,
      distanceKm,
      demand: demand || undefined,
      requisition: openReq || undefined,
    });
  }

  // 3. Score and rank candidates
  const ranked = rankCandidates(unit, rawCandidates);
  const topCandidates = ranked.slice(0, config.offersPerRing);

  return {
    unitId,
    ring,
    escalationId,
    candidates: topCandidates,
    hasCandidates: topCandidates.length > 0,
  };
}
