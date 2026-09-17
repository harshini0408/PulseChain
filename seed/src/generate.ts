import {
  facilityKey,
  facilityGsi1,
  demandKey,
  unitKey,
  unitQueueGsi1,
  unitStockGsi2,
  requisitionKey,
  openReqGsi1,
  hospitalReqsGsi2,
  statsDayKey,
  poolKey,
  poolsGsi1,
  isoNow,
  todayKey,
  type Facility,
  type BloodUnit,
  type StandingDemand,
  type Requisition,
  type DonorPool,
} from "@pulsechain/shared";
import { generateDistanceItems } from "./distances.js";

export const SEEDED_FACILITIES: Facility[] = [
  {
    facilityId: "CBE-BC-01",
    name: "Coimbatore Central Blood Centre",
    type: "BLOOD_CENTRE",
    city: "Coimbatore",
    lat: 11.0168,
    lng: 76.9558,
    components: ["PLATELETS", "RBC", "PLASMA"],
    contactEmail: "centre-demo@pulsechain.org",
  },
  {
    facilityId: "CBE-HOSP-04",
    name: "Coimbatore East Hospital",
    type: "HOSPITAL",
    city: "Coimbatore",
    lat: 11.051,
    lng: 77.024,
    components: ["PLATELETS", "RBC", "PLASMA"],
    contactEmail: "hospital-demo@pulsechain.org",
  },
  {
    facilityId: "TUP-HOSP-01",
    name: "Tiruppur General Hospital",
    type: "HOSPITAL",
    city: "Tiruppur",
    lat: 11.1085,
    lng: 77.3411,
    components: ["PLATELETS", "RBC"],
    contactEmail: "tiruppur-demo@pulsechain.org",
  },
  {
    facilityId: "ERD-HOSP-02",
    name: "Erode Medical Trust",
    type: "HOSPITAL",
    city: "Erode",
    lat: 11.341,
    lng: 77.7172,
    components: ["PLATELETS", "RBC", "PLASMA"],
    contactEmail: "erode-demo@pulsechain.org",
  },
  {
    facilityId: "SLM-HOSP-03",
    name: "Salem Super Specialty Hospital",
    type: "HOSPITAL",
    city: "Salem",
    lat: 11.6643,
    lng: 78.146,
    components: ["PLATELETS", "RBC", "PLASMA"],
    contactEmail: "salem-demo@pulsechain.org",
  },
];

export function generateAllSeedItems() {
  const items: any[] = [];
  const now = new Date();
  const nowIso = isoNow(now);

  // 1. Facilities
  for (const fac of SEEDED_FACILITIES) {
    const keys = facilityKey(fac.facilityId);
    const gsi1 = facilityGsi1(fac.type, fac.facilityId);
    items.push({
      ...keys,
      ...gsi1,
      entityType: "FACILITY",
      ...fac,
    });
  }

  // 2. Distances
  const distItems = generateDistanceItems(SEEDED_FACILITIES);
  items.push(...distItems);

  // 3. Standing Demands
  const demands: StandingDemand[] = [
    {
      facilityId: "CBE-HOSP-04",
      component: "PLATELETS",
      bloodGroup: "O-",
      weeklyUnits: 8,
      level: "HIGH",
    },
    {
      facilityId: "CBE-HOSP-04",
      component: "RBC",
      bloodGroup: "A+",
      weeklyUnits: 12,
      level: "HIGH",
    },
    {
      facilityId: "TUP-HOSP-01",
      component: "PLATELETS",
      bloodGroup: "O-",
      weeklyUnits: 4,
      level: "MEDIUM",
    },
    {
      facilityId: "ERD-HOSP-02",
      component: "PLATELETS",
      bloodGroup: "O-",
      weeklyUnits: 6,
      level: "HIGH",
    },
  ];

  for (const dem of demands) {
    const keys = demandKey(dem.facilityId, dem.component, dem.bloodGroup);
    items.push({
      ...keys,
      entityType: "DEMAND",
      ...dem,
    });
  }

  // 4. Units (Live dynamic expiry times)
  // Hero Platelet Unit: 36 hours remaining (within 48h threshold)
  const heroPlateletExpiry = new Date(now.getTime() + 36 * 3600 * 1000).toISOString();
  const heroPlateletCollected = new Date(now.getTime() - 84 * 3600 * 1000).toISOString();

  const units: BloodUnit[] = [
    {
      unitId: "PLT-102",
      facilityId: "CBE-BC-01",
      component: "PLATELETS",
      bloodGroup: "O-",
      volumeMl: 250,
      valueInr: 1500,
      collectedAt: heroPlateletCollected,
      expiresAt: heroPlateletExpiry,
      status: "AVAILABLE",
      version: 1,
    },
    {
      unitId: "RBC-441",
      facilityId: "CBE-BC-01",
      component: "RBC",
      bloodGroup: "B+",
      volumeMl: 300,
      valueInr: 1500,
      collectedAt: new Date(now.getTime() - 10 * 86400 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 25 * 86400 * 1000).toISOString(),
      status: "AVAILABLE",
      version: 1,
    },
    {
      unitId: "PLT-108",
      facilityId: "CBE-BC-01",
      component: "PLATELETS",
      bloodGroup: "A+",
      volumeMl: 300,
      valueInr: 1500,
      collectedAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 72 * 3600 * 1000).toISOString(),
      status: "AVAILABLE",
      version: 1,
    },
  ];

  for (const u of units) {
    const keys = unitKey(u.unitId);
    const gsi1 = unitQueueGsi1(u.status, u.component, u.expiresAt, u.unitId);
    const gsi2 = unitStockGsi2(u.facilityId, u.expiresAt, u.unitId);
    items.push({
      ...keys,
      ...gsi1,
      ...gsi2,
      entityType: "UNIT",
      ...u,
    });
  }

  // 5. Open Requisition matching hero unit
  const reqNeededBy = new Date(now.getTime() + 18 * 3600 * 1000).toISOString();
  const req: Requisition = {
    reqId: "REQ-2001",
    hospitalId: "CBE-HOSP-04",
    component: "PLATELETS",
    bloodGroup: "O-",
    unitsRequested: 2,
    unitsFilled: 0,
    urgency: "HIGH",
    neededBy: reqNeededBy,
    status: "OPEN",
    source: "MANUAL",
    createdAt: nowIso,
  };

  const reqKeys = requisitionKey(req.reqId);
  const reqGsi1 = openReqGsi1(req.component, req.bloodGroup, req.neededBy);
  const reqGsi2 = hospitalReqsGsi2(req.hospitalId, req.neededBy);

  items.push({
    ...reqKeys,
    ...reqGsi1,
    ...reqGsi2,
    entityType: "Requisition",
    ...req,
  });

  // 6. Donor Pools
  const pool: DonorPool = {
    poolId: "PSG-ITECH",
    name: "PSG iTech Campus Donor Pool",
    poolType: "COLLEGE",
    lat: 11.0655,
    lng: 77.093,
    registered: 512,
    groupCounts: {
      "O+": 184,
      "A+": 126,
      "B+": 102,
      "AB+": 38,
      "O-": 12,
      "A-": 19,
      "B-": 27,
      "AB-": 4,
    },
  };

  const pKeys = poolKey(pool.poolId);
  const pGsi1 = poolsGsi1(pool.poolId);
  items.push({
    ...pKeys,
    ...pGsi1,
    entityType: "DONOR_POOL",
    ...pool,
  });

  // 7. Initial Daily Stats
  const statKeys = statsDayKey(todayKey(now));
  items.push({
    ...statKeys,
    entityType: "DailyStats",
    unitsSaved: 5,
    unitsLost: 1,
    valueSavedInr: 7500,
    valueLostInr: 1500,
  });

  return items;
}
