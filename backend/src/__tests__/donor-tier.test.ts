import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DonorPool } from "@pulsechain/shared";

// Mock the db module
vi.mock("../lib/db.js", () => {
  return {
    docClient: {
      send: vi.fn().mockResolvedValue({}),
    },
    requireTableName: () => "PulseChainTest",
    getItem: vi.fn(),
    queryAll: vi.fn(),
    putItem: vi.fn(),
  };
});

// Mock the audit module
vi.mock("../lib/audit.js", () => {
  return {
    writeAuditEvent: vi.fn().mockResolvedValue({}),
  };
});

import { getItem, queryAll, docClient } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";
import { activateDonorTier } from "../workers/donor-tier.js";

describe("Donor Tier Activation Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("satisfies all 5 deterministic ranking stages and selects up to 5 eligible pools", async () => {
    const now = "2026-09-19T10:00:00.000Z";

    // Hospital in Coimbatore centre (11.0168, 76.9558)
    vi.mocked(getItem).mockImplementation(async (pk: string, sk: string) => {
      if (pk.startsWith("FACILITY#")) {
        return {
          facilityId: "FAC_HOSPITAL_1",
          name: "Coimbatore Medical Center",
          lat: 11.0168,
          lng: 76.9558,
        };
      }
      return null;
    });

    const mockPools: (DonorPool & { PK: string; SK: string })[] = [
      // Pool A: Has requested group O+, not in cooldown, 2 km away, 10 donors
      {
        PK: "POOL#POOL_A",
        SK: "META",
        poolId: "POOL_A",
        name: "Pool A (Near, Matching)",
        poolType: "COLLEGE",
        lat: 11.025,
        lng: 76.965,
        registered: 50,
        groupCounts: { "O+": 10, "A+": 40 },
        contactName: "Admin A",
        contactEmail: "a@example.invalid",
        lastMobilisedAt: null,
      },
      // Pool B: Has requested group O+, not in cooldown, 10 km away, 50 donors
      {
        PK: "POOL#POOL_B",
        SK: "META",
        poolId: "POOL_B",
        name: "Pool B (Farther, Matching)",
        poolType: "RWA",
        lat: 11.08,
        lng: 77.02,
        registered: 100,
        groupCounts: { "O+": 50, "B+": 50 },
        contactName: "Admin B",
        contactEmail: "b@example.invalid",
        lastMobilisedAt: null,
      },
      // Pool C: Has requested group O+, BUT in 24h cooldown (mobilised 2 hours ago)
      {
        PK: "POOL#POOL_C",
        SK: "META",
        poolId: "POOL_C",
        name: "Pool C (In Cooldown)",
        poolType: "CORPORATE",
        lat: 11.018,
        lng: 76.956,
        registered: 30,
        groupCounts: { "O+": 15, "A+": 15 },
        contactName: "Admin C",
        contactEmail: "c@example.invalid",
        lastMobilisedAt: "2026-09-19T08:00:00.000Z", // 2h ago
      },
      // Pool D: NO O+ donors at all (0 count)
      {
        PK: "POOL#POOL_D",
        SK: "META",
        poolId: "POOL_D",
        name: "Pool D (No matching blood)",
        poolType: "COLLEGE",
        lat: 11.017,
        lng: 76.957,
        registered: 20,
        groupCounts: { "B+": 20 },
        contactName: "Admin D",
        contactEmail: "d@example.invalid",
        lastMobilisedAt: null,
      },
      // Pool E: Same location & distance as Pool F, but higher count of O+
      {
        PK: "POOL#POOL_E",
        SK: "META",
        poolId: "POOL_E",
        name: "Pool E (Higher Count)",
        poolType: "COLLEGE",
        lat: 11.03,
        lng: 76.96,
        registered: 60,
        groupCounts: { "O+": 25 },
        contactName: "Admin E",
        contactEmail: "e@example.invalid",
        lastMobilisedAt: null,
      },
      // Pool F: Same location & distance as Pool E, but lower count of O+
      {
        PK: "POOL#POOL_F",
        SK: "META",
        poolId: "POOL_F",
        name: "Pool F (Lower Count)",
        poolType: "COLLEGE",
        lat: 11.03,
        lng: 76.96,
        registered: 30,
        groupCounts: { "O+": 5 },
        contactName: "Admin F",
        contactEmail: "f@example.invalid",
        lastMobilisedAt: null,
      },
      // Pool G: Another eligible matching pool
      {
        PK: "POOL#POOL_G",
        SK: "META",
        poolId: "POOL_G",
        name: "Pool G (Extra Eligible)",
        poolType: "CORPORATE",
        lat: 11.05,
        lng: 76.98,
        registered: 40,
        groupCounts: { "O+": 12 },
        contactName: "Admin G",
        contactEmail: "g@example.invalid",
        lastMobilisedAt: null,
      },
    ];

    vi.mocked(queryAll).mockResolvedValue(mockPools);

    const result = await activateDonorTier({
      requisitionId: "REQ_12345",
      facilityId: "FAC_HOSPITAL_1",
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: 2,
      now,
    });

    expect(result.status).toBe("DONOR_TIER_ACTIVATED");
    // Only up to 5 eligible pools are selected
    expect(result.poolsAlerted).toBeLessThanOrEqual(5);
    expect(result.selectedPools).toBeDefined();

    const selectedIds = result.selectedPools!.map((p) => p.poolId);

    // Pool D has 0 O+ donors -> MUST NOT be in eligible selected pools
    expect(selectedIds).not.toContain("POOL_D");

    // Pool A (close, matching, not in cooldown) must rank ahead of Pool B (farther)
    const rankA = selectedIds.indexOf("POOL_A");
    const rankB = selectedIds.indexOf("POOL_B");
    expect(rankA).toBeLessThan(rankB);

    // Pool E & F: same distance, E has higher count so E ranks ahead of F
    const rankE = selectedIds.indexOf("POOL_E");
    const rankF = selectedIds.indexOf("POOL_F");
    expect(rankE).toBeLessThan(rankF);

    // Pool C is in cooldown -> must rank behind all unmobilised matching pools
    // Since there are 5 unmobilised eligible pools (A, B, E, F, G), Pool C is pushed to 6th (outside top 5)
    expect(selectedIds).not.toContain("POOL_C");

    // Verify audit event written with structured details
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "DONOR_TIER_TRIGGERED",
        subjectType: "REQUISITION",
        subjectId: "REQ_12345",
        actorFacilityId: "FAC_HOSPITAL_1",
        details: expect.objectContaining({
          poolsAlertedCount: result.poolsAlerted,
          selectedPools: expect.arrayContaining([
            expect.objectContaining({
              poolId: expect.any(String),
              rank: expect.any(Number),
              distanceKm: expect.any(Number),
              hasBloodGroup: true,
              donorCount: expect.any(Number),
              inCooldown: expect.any(Boolean),
            }),
          ]),
        }),
      }),
    );
  });

  it("enforces requisition-level idempotency", async () => {
    vi.mocked(getItem).mockResolvedValueOnce({
      reqId: "REQ_ALREADY_TRIGGERED",
      status: "DONOR_TIER",
    });

    const result = await activateDonorTier({
      requisitionId: "REQ_ALREADY_TRIGGERED",
      facilityId: "FAC_HOSPITAL_1",
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: 1,
    });

    expect(result.status).toBe("DONOR_TIER_ALREADY_ACTIVATED");
    expect(result.poolsAlerted).toBe(0);
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });
});
