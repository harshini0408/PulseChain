import { describe, it, expect } from "vitest";
import { rankCandidates, type Candidate } from "../src/scoring.js";
import type { BloodUnit, Facility, StandingDemand, Requisition } from "../src/types.js";

const sampleUnit: BloodUnit = {
  unitId: "U101",
  facilityId: "FAC_SRC",
  component: "PLATELETS",
  bloodGroup: "O-",
  volumeMl: 300,
  valueInr: 1500,
  collectedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  expiresAt: new Date(Date.now() + 3600000 * 36).toISOString(),
  status: "AVAILABLE",
  version: 1,
};

const createFacility = (id: string, name: string): Facility => ({
  facilityId: id,
  name,
  type: "HOSPITAL",
  city: "Coimbatore",
  lat: 11.0168,
  lng: 76.9558,
  components: ["PLATELETS", "RBC"],
  contactEmail: `${id.toLowerCase()}@hospital.org`,
});

describe("rankCandidates", () => {
  it("excludes INCOMPATIBLE candidates", () => {
    const candidateA: Candidate = {
      facility: createFacility("FAC_A", "Hospital A"),
      distanceKm: 5,
      demand: {
        facilityId: "FAC_A",
        component: "PLATELETS",
        bloodGroup: "B+",
        weeklyUnits: 10,
        level: "HIGH",
      },
    };

    const unitA: BloodUnit = {
      ...sampleUnit,
      bloodGroup: "A+",
    };

    const ranked = rankCandidates(unitA, [candidateA]);
    expect(ranked).toHaveLength(0);
  });

  it("ranks IDENTICAL compatibility above COMPATIBLE", () => {
    const identicalCandidate: Candidate = {
      facility: createFacility("FAC_ID", "Hospital Identical"),
      distanceKm: 10,
      demand: {
        facilityId: "FAC_ID",
        component: "PLATELETS",
        bloodGroup: "O-",
        weeklyUnits: 5,
        level: "MEDIUM",
      },
    };

    const compatibleCandidate: Candidate = {
      facility: createFacility("FAC_COMP", "Hospital Compatible"),
      distanceKm: 10,
      demand: {
        facilityId: "FAC_COMP",
        component: "PLATELETS",
        bloodGroup: "A+",
        weeklyUnits: 5,
        level: "MEDIUM",
      },
    };

    const ranked = rankCandidates(sampleUnit, [compatibleCandidate, identicalCandidate]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].facility.facilityId).toBe("FAC_ID");
    expect(ranked[0].breakdown.compatibility).toBe(1.0);
    expect(ranked[1].breakdown.compatibility).toBe(0.75);
  });

  it("closer distance ranks higher among equal compatibility", () => {
    const closeCandidate: Candidate = {
      facility: createFacility("FAC_CLOSE", "Close Hospital"),
      distanceKm: 3,
    };

    const farCandidate: Candidate = {
      facility: createFacility("FAC_FAR", "Far Hospital"),
      distanceKm: 25,
    };

    const ranked = rankCandidates(sampleUnit, [farCandidate, closeCandidate]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].facility.facilityId).toBe("FAC_CLOSE");
    expect(ranked[1].facility.facilityId).toBe("FAC_FAR");
  });

  it("candidate with open matching requisition ranks higher", () => {
    const candidateWithReq: Candidate = {
      facility: createFacility("FAC_REQ", "Hospital with Req"),
      distanceKm: 10,
      requisition: {
        reqId: "REQ_1",
        hospitalId: "FAC_REQ",
        component: "PLATELETS",
        bloodGroup: "O-",
        unitsRequested: 2,
        unitsFilled: 0,
        urgency: "HIGH",
        neededBy: new Date(Date.now() + 3600000 * 6).toISOString(),
        status: "OPEN",
        source: "MANUAL",
        createdAt: new Date().toISOString(),
      },
    };

    const candidateWithoutReq: Candidate = {
      facility: createFacility("FAC_NOREQ", "Hospital without Req"),
      distanceKm: 10,
    };

    const ranked = rankCandidates(sampleUnit, [candidateWithoutReq, candidateWithReq]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].facility.facilityId).toBe("FAC_REQ");
    expect(ranked[0].breakdown.openRequisition).toBe(1.0);
  });

  it("CRITICAL urgency boosts score", () => {
    const criticalCandidate: Candidate = {
      facility: createFacility("FAC_CRIT", "Critical Hospital"),
      distanceKm: 10,
      requisition: {
        reqId: "REQ_CRIT",
        hospitalId: "FAC_CRIT",
        component: "PLATELETS",
        bloodGroup: "O-",
        unitsRequested: 1,
        unitsFilled: 0,
        urgency: "CRITICAL",
        neededBy: new Date().toISOString(),
        status: "OPEN",
        source: "MANUAL",
        createdAt: new Date().toISOString(),
      },
    };

    const normalCandidate: Candidate = {
      facility: createFacility("FAC_NORM", "Normal Hospital"),
      distanceKm: 10,
      requisition: {
        reqId: "REQ_NORM",
        hospitalId: "FAC_NORM",
        component: "PLATELETS",
        bloodGroup: "O-",
        unitsRequested: 1,
        unitsFilled: 0,
        urgency: "NORMAL",
        neededBy: new Date().toISOString(),
        status: "OPEN",
        source: "MANUAL",
        createdAt: new Date().toISOString(),
      },
    };

    const ranked = rankCandidates(sampleUnit, [normalCandidate, criticalCandidate]);
    expect(ranked[0].facility.facilityId).toBe("FAC_CRIT");
    expect(ranked[0].breakdown.urgency).toBe(1.0);
    expect(ranked[1].breakdown.urgency).toBe(0.2);
  });

  it("ties broken by lower distanceKm then lexicographic facilityId", () => {
    const c1: Candidate = {
      facility: createFacility("FAC_B", "Hospital B"),
      distanceKm: 5,
    };
    const c2: Candidate = {
      facility: createFacility("FAC_A", "Hospital A"),
      distanceKm: 5,
    };

    const ranked = rankCandidates(sampleUnit, [c1, c2]);
    expect(ranked[0].facility.facilityId).toBe("FAC_A");
    expect(ranked[1].facility.facilityId).toBe("FAC_B");
  });

  it("returns correct per-factor breakdown scores", () => {
    const c: Candidate = {
      facility: createFacility("FAC_1", "Hospital 1"),
      distanceKm: 8,
      demand: {
        facilityId: "FAC_1",
        component: "PLATELETS",
        bloodGroup: "O-",
        weeklyUnits: 20,
        level: "HIGH",
      },
    };

    const ranked = rankCandidates(sampleUnit, [c]);
    expect(ranked[0].breakdown).toHaveProperty("compatibility");
    expect(ranked[0].breakdown).toHaveProperty("distanceKm", 8);
    expect(ranked[0].breakdown).toHaveProperty("standingDemand");
    expect(ranked[0].breakdown).toHaveProperty("hoursRemaining");
  });

  it("reason text is a non-empty human-readable sentence", () => {
    const c: Candidate = {
      facility: createFacility("FAC_1", "Hospital 1"),
      distanceKm: 4,
    };

    const ranked = rankCandidates(sampleUnit, [c]);
    expect(typeof ranked[0].reason).toBe("string");
    expect(ranked[0].reason.length).toBeGreaterThan(10);
  });

  it("empty candidates list returns empty array", () => {
    expect(rankCandidates(sampleUnit, [])).toEqual([]);
  });

  it("all INCOMPATIBLE candidates returns empty array", () => {
    const rbcUnit: BloodUnit = {
      ...sampleUnit,
      component: "RBC",
      bloodGroup: "A+",
    };

    const c: Candidate = {
      facility: createFacility("FAC_B", "Hospital B"),
      distanceKm: 5,
      demand: {
        facilityId: "FAC_B",
        component: "RBC",
        bloodGroup: "B-",
        weeklyUnits: 10,
        level: "HIGH",
      },
    };

    expect(rankCandidates(rbcUnit, [c])).toEqual([]);
  });
});
