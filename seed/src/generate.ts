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
  communityKey,
  communityGsi1,
  donorKey,
  donorGsi1,
  donorGsi2,
  computeNextEligibleDate,
  type Community,
  type Donor,
  todayKey,
  type Facility,
  type BloodUnit,
  type StandingDemand,
  type Requisition,
} from "@pulsechain/shared";
import { generateDistanceItems } from "./distances.js";

export const SEEDED_COMMUNITIES: Community[] = [
  {
    communityId: "COMM-PSG-ITECH",
    name: "PSG iTech Volunteer Community",
    type: "COLLEGE",
    lat: 11.058,
    lng: 77.078,
    city: "Coimbatore",
    memberCount: 35,
    groupCounts: {},
    coordinatorName: "Dr. K. Senthil Nathan (NSS Officer)",
    coordinatorContact: "+91 94432 10982",
    joinCode: "PSG-7X",
    verified: false,
  },
  {
    communityId: "COMM-KCT",
    name: "Kumaraguru College of Technology YRC",
    type: "COLLEGE",
    lat: 11.0775,
    lng: 76.989,
    city: "Coimbatore",
    memberCount: 30,
    groupCounts: {},
    coordinatorName: "Prof. Priya Ramasamy",
    coordinatorContact: "+91 98422 33441",
    joinCode: "KCT-2B",
    verified: false,
  },
  {
    communityId: "COMM-AMRITA",
    name: "Amrita Vishwa Vidyapeetham Pool",
    type: "COLLEGE",
    lat: 10.9027,
    lng: 76.9006,
    city: "Coimbatore",
    memberCount: 25,
    groupCounts: {},
    coordinatorName: "Dr. Anand Kumar",
    coordinatorContact: "+91 97890 11223",
    joinCode: "AMR-9Q",
    verified: false,
  },
  {
    communityId: "COMM-RAHEJA",
    name: "Raheja Vivarea Apartment Association",
    type: "RESIDENTIAL",
    lat: 11.0022,
    lng: 76.9734,
    city: "Coimbatore",
    memberCount: 22,
    groupCounts: {},
    coordinatorName: "R. Muralidharan (Secretary)",
    coordinatorContact: "+91 98940 55667",
    joinCode: "RAH-4M",
    verified: false,
  },
  {
    communityId: "COMM-MAYFLOWER",
    name: "Mayflower Gardens RWA",
    type: "RESIDENTIAL",
    lat: 11.0285,
    lng: 77.0021,
    city: "Coimbatore",
    memberCount: 24,
    groupCounts: {},
    coordinatorName: "S. Venkatesh (Wellness Lead)",
    coordinatorContact: "+91 98430 77889",
    joinCode: "MAY-1K",
    verified: false,
  },
  {
    communityId: "COMM-BOSCH",
    name: "Bosch Global Software Campus CSR",
    type: "CORPORATE",
    lat: 11.112,
    lng: 76.998,
    city: "Coimbatore",
    memberCount: 24,
    groupCounts: {},
    coordinatorName: "Anitha Chandran",
    coordinatorContact: "+91 99520 88990",
    joinCode: "BOS-8P",
    verified: false,
  },
  {
    communityId: "COMM-TEA-TUP",
    name: "Tiruppur Exporters Chamber Network",
    type: "NGO",
    lat: 11.107,
    lng: 77.345,
    city: "Tiruppur",
    memberCount: 20,
    groupCounts: {},
    coordinatorName: "M. Palanisamy",
    coordinatorContact: "+91 98421 66778",
    joinCode: "TEA-5Z",
    verified: false,
  },
];

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

  // 6. Seed Communities & 180 Donors (Prompt 17)
  const donorNames = [
    "Karthik Raja", "Praveen Kumar", "Aravind Swamy", "Suresh Menon", "Dinesh Babu",
    "Ganesh Moorthy", "Vigneshwaran M", "Vijay Anand", "Saravanan K", "Muthuvel P",
    "Deepak Raman", "Ashwin Sundaram", "Hariharan V", "Manoj Kumar", "Naveen Raj",
    "Balamurugan S", "Chandrasekar T", "Elango R", "Gopalakrishnan N", "Jayakumar V",
    "Kavitha Sundaram", "Divya Bharathi", "Pooja Hegde", "Sneha R", "Ananya Krishnan",
    "Meenakshi Sundaram", "Keerthi Suresh", "Revathi M", "Lakshmi Narayanan", "Sandhya R",
    "Aishwarya Mohan", "Bhavani Shankar", "Gayathri Devi", "Harini Venkat", "Indira Priyadarshini",
    "Janani R", "Lavanya K", "Malathi N", "Nandhini S", "Pavithra M",
    "Rajeswari C", "Sangeetha R", "Thenmozhi P", "Uma Maheshwari", "Vasanthi K",
    "Yamuna Devi", "Abinaya S", "Bhuvaneshwari M", "Chitra Devi", "Dhanalakshmi R"
  ];

  // Distribution: B+ 35.7% (64), O+ 34.3% (62), A+ 20.0% (36), Negatives 10% (8 O-, 4 A-, 4 B-, 2 AB-) -> 180
  const bloodGroupList: BloodGroup[] = [
    ...Array(64).fill("B+"),
    ...Array(62).fill("O+"),
    ...Array(36).fill("A+"),
    ...Array(8).fill("O-"),
    ...Array(4).fill("A-"),
    ...Array(4).fill("B-"),
    ...Array(2).fill("AB-"),
  ];

  const communityCounts: Record<string, Partial<Record<BloodGroup, number>>> = {};
  SEEDED_COMMUNITIES.forEach((c) => {
    communityCounts[c.communityId] = {};
  });

  for (let i = 0; i < 180; i++) {
    const commIndex = i % SEEDED_COMMUNITIES.length;
    const comm = SEEDED_COMMUNITIES[commIndex];
    const donorId = `D-${1000 + i}`;
    const name = `${donorNames[i % donorNames.length]} ${String.fromCharCode(65 + (i % 26))}`;
    const bloodGroup = bloodGroupList[i];

    communityCounts[comm.communityId][bloodGroup] =
      (communityCounts[comm.communityId][bloodGroup] || 0) + 1;

    let lastDonationAt: string | undefined = undefined;
    let nextEligibleAt: string = new Date(0).toISOString();
    let selfDeferredUntil: string | undefined = undefined;

    if (i < 80) {
      if (i % 2 === 0) {
        const daysAgo = 100 + (i % 50);
        lastDonationAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000).toISOString();
        nextEligibleAt = computeNextEligibleDate(lastDonationAt);
      } else {
        lastDonationAt = undefined;
        nextEligibleAt = new Date(0).toISOString();
      }
    } else if (i < 140) {
      const daysAgo = 30 + (i % 31);
      lastDonationAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000).toISOString();
      nextEligibleAt = computeNextEligibleDate(lastDonationAt);
    } else if (i < 170) {
      const daysAgo = 5 + (i % 16);
      lastDonationAt = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000).toISOString();
      nextEligibleAt = computeNextEligibleDate(lastDonationAt);
    } else {
      const deferDays = 7 + (i % 15);
      selfDeferredUntil = new Date(now.getTime() + deferDays * 24 * 3600 * 1000).toISOString();
      lastDonationAt = new Date(now.getTime() - 110 * 24 * 3600 * 1000).toISOString();
      nextEligibleAt = computeNextEligibleDate(lastDonationAt);
    }

    const donor: Donor = {
      donorId,
      name,
      bloodGroup,
      lat: Math.round((comm.lat + (Math.sin(i) * 0.005)) * 10000) / 10000,
      lng: Math.round((comm.lng + (Math.cos(i) * 0.005)) * 10000) / 10000,
      city: comm.city,
      communityId: comm.communityId,
      lastDonationAt,
      nextEligibleAt,
      selfDeferredUntil,
      contactVia: i % 10 === 0 ? "DIRECT" : "COORDINATOR",
      phone: `+91 9${String(100000000 + i * 373).slice(0, 9)}`,
      email: `donor.${donorId.toLowerCase()}@pulsechain.org`,
      registeredAt: new Date(now.getTime() - 180 * 24 * 3600 * 1000).toISOString(),
      verifiedDonations: lastDonationAt ? (1 + (i % 4)) : 0,
    };

    const dKeys = donorKey(donorId);
    const dGsi1 = donorGsi1(donor.bloodGroup, donor.nextEligibleAt, donorId);
    const dGsi2 = donorGsi2(comm.communityId, donor.name);

    items.push({
      ...dKeys,
      ...dGsi1,
      ...dGsi2,
      entityType: "DONOR",
      ...donor,
    });
  }

  // Push community items with actual group counts
  for (const comm of SEEDED_COMMUNITIES) {
    const cKeys = communityKey(comm.communityId);
    const cGsi1 = communityGsi1(comm.type, comm.communityId);
    const groupCounts = communityCounts[comm.communityId] || {};
    const memberCount = Object.values(groupCounts).reduce((a, b) => a + (b || 0), 0);

    items.push({
      ...cKeys,
      ...cGsi1,
      entityType: "COMMUNITY",
      ...comm,
      memberCount,
      groupCounts,
    });
  }

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
