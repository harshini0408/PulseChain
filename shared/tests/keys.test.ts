import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import {
  facilityKey,
  facilityGsi1,
  distanceKey,
  unitKey,
  unitQueueGsi1,
  unitStockGsi2,
  requisitionKey,
  openReqGsi1,
  hospitalReqsGsi2,
  statsDayKey,
  poolKey,
  poolsGsi1,
  donorKey,
  donorGsi1,
  donorGsi2,
  communityKey,
  communityGsi1,
  communityAlertKey,
  communityAlertGsi1,
  communityAlertGsi2,
} from "../src/keys.js";

// Load sample-items.json and extract items as a flat map keyed by PK+SK
const __dirname = dirname(fileURLToPath(import.meta.url));
const rawJson = readFileSync(
  resolve(__dirname, "../../infra/db/sample-items.json"),
  "utf-8",
);

interface DdbItem { [attr: string]: { S?: string; N?: string; L?: unknown[]; M?: unknown } }
interface SampleItems { PulseChain: Array<{ PutRequest: { Item: DdbItem } }> }

const { PulseChain: items }: SampleItems = JSON.parse(rawJson);

function findItem(pk: string, sk: string): DdbItem {
  const match = items.find(
    (r) => r.PutRequest.Item["PK"]?.S === pk && r.PutRequest.Item["SK"]?.S === sk,
  );
  if (!match) throw new Error(`Item not found: PK=${pk} SK=${sk}`);
  return match.PutRequest.Item;
}

function s(item: DdbItem, attr: string): string {
  const val = item[attr]?.S;
  if (val === undefined) throw new Error(`Attribute ${attr} not found`);
  return val;
}

// ---------------------------------------------------------------------------
// Facility keys — CBE-BC-01
// ---------------------------------------------------------------------------
describe("facilityKey", () => {
  it("CBE-BC-01 PK/SK match sample-items.json", () => {
    const item = findItem("FACILITY#CBE-BC-01", "PROFILE");
    const k = facilityKey("CBE-BC-01");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });
});

describe("facilityGsi1", () => {
  it("CBE-BC-01 GSI1PK/GSI1SK match sample-items.json", () => {
    const item = findItem("FACILITY#CBE-BC-01", "PROFILE");
    const g = facilityGsi1("BLOOD_CENTRE", "CBE-BC-01");
    expect(g.GSI1PK).toBe(s(item, "GSI1PK"));
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });

  it("CBE-HOSP-04 GSI1SK matches", () => {
    const item = findItem("FACILITY#CBE-HOSP-04", "PROFILE");
    const g = facilityGsi1("HOSPITAL", "CBE-HOSP-04");
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });
});

// ---------------------------------------------------------------------------
// Distance keys
// ---------------------------------------------------------------------------
describe("distanceKey", () => {
  it("CBE-BC-01 → CBE-HOSP-04 (8.4 km) SK matches", () => {
    const item = findItem("FACILITY#CBE-BC-01", "DIST#008.4#CBE-HOSP-04");
    const k = distanceKey("CBE-BC-01", 8.4, "CBE-HOSP-04");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });

  it("CBE-BC-01 → TUP-HOSP-01 (43.3 km) SK matches", () => {
    const item = findItem("FACILITY#CBE-BC-01", "DIST#043.3#TUP-HOSP-01");
    const k = distanceKey("CBE-BC-01", 43.3, "TUP-HOSP-01");
    expect(k.SK).toBe(s(item, "SK"));
  });
});

// ---------------------------------------------------------------------------
// Unit keys — PLT-102
// ---------------------------------------------------------------------------
describe("unitKey", () => {
  it("PLT-102 PK/SK match", () => {
    const item = findItem("UNIT#PLT-102", "META");
    const k = unitKey("PLT-102");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });
});

describe("unitQueueGsi1", () => {
  it("PLT-102 GSI1PK/GSI1SK match", () => {
    const item = findItem("UNIT#PLT-102", "META");
    const g = unitQueueGsi1("AVAILABLE", "PLATELETS", "2026-09-19T06:00:00Z", "PLT-102");
    expect(g.GSI1PK).toBe(s(item, "GSI1PK"));
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });

  it("RBC-441 GSI1PK/GSI1SK match", () => {
    const item = findItem("UNIT#RBC-441", "META");
    const g = unitQueueGsi1("AVAILABLE", "RBC", "2026-10-08T06:00:00Z", "RBC-441");
    expect(g.GSI1PK).toBe(s(item, "GSI1PK"));
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });
});

describe("unitStockGsi2", () => {
  it("PLT-102 GSI2PK/GSI2SK match", () => {
    const item = findItem("UNIT#PLT-102", "META");
    const g = unitStockGsi2("CBE-BC-01", "2026-09-19T06:00:00Z", "PLT-102");
    expect(g.GSI2PK).toBe(s(item, "GSI2PK"));
    expect(g.GSI2SK).toBe(s(item, "GSI2SK"));
  });
});

// ---------------------------------------------------------------------------
// Requisition keys — REQ-2001
// ---------------------------------------------------------------------------
describe("requisitionKey", () => {
  it("REQ-2001 PK/SK match", () => {
    const item = findItem("REQ#REQ-2001", "META");
    const k = requisitionKey("REQ-2001");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });
});

describe("openReqGsi1", () => {
  it("REQ-2001 GSI1PK/GSI1SK match", () => {
    const item = findItem("REQ#REQ-2001", "META");
    const g = openReqGsi1("PLATELETS", "O-", "2026-09-18T02:30:00Z");
    expect(g.GSI1PK).toBe(s(item, "GSI1PK"));
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });
});

describe("hospitalReqsGsi2", () => {
  it("REQ-2001 GSI2PK/GSI2SK match", () => {
    const item = findItem("REQ#REQ-2001", "META");
    const g = hospitalReqsGsi2("CBE-HOSP-04", "2026-09-18T02:30:00Z");
    expect(g.GSI2PK).toBe(s(item, "GSI2PK"));
    expect(g.GSI2SK).toBe(s(item, "GSI2SK"));
  });
});

// ---------------------------------------------------------------------------
// Stats / Pool
// ---------------------------------------------------------------------------
describe("statsDayKey", () => {
  it("DAY#2026-09-16 matches", () => {
    const item = findItem("STATS", "DAY#2026-09-16");
    const k = statsDayKey("2026-09-16");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });
});

describe("poolKey / poolsGsi1", () => {
  it("PSG-ITECH PK/SK match", () => {
    const item = findItem("POOL#PSG-ITECH", "META");
    const k = poolKey("PSG-ITECH");
    expect(k.PK).toBe(s(item, "PK"));
    expect(k.SK).toBe(s(item, "SK"));
  });

  it("PSG-ITECH GSI1PK/GSI1SK match", () => {
    const item = findItem("POOL#PSG-ITECH", "META");
    const g = poolsGsi1("PSG-ITECH");
    expect(g.GSI1PK).toBe(s(item, "GSI1PK"));
    expect(g.GSI1SK).toBe(s(item, "GSI1SK"));
  });
});

describe("Donor and Community keys", () => {
  it("generates correct donor keys", () => {
    const k = donorKey("D-101");
    expect(k.PK).toBe("DONOR#D-101");
    expect(k.SK).toBe("PROFILE");

    const gsi1 = donorGsi1("O-", "2026-09-18T10:00:00Z", "D-101");
    expect(gsi1.GSI1PK).toBe("DONORS#O-");
    expect(gsi1.GSI1SK).toBe("2026-09-18T10:00:00Z#D-101");

    const gsi2 = donorGsi2("COMM-01", "Karthik R");
    expect(gsi2.GSI2PK).toBe("COMMUNITY#COMM-01#MEMBERS");
    expect(gsi2.GSI2SK).toBe("Karthik R");
  });

  it("generates correct community and alert keys", () => {
    const ck = communityKey("COMM-01");
    expect(ck.PK).toBe("COMMUNITY#COMM-01");
    expect(ck.SK).toBe("PROFILE");

    const cgsi1 = communityGsi1("COLLEGE", "COMM-01");
    expect(cgsi1.GSI1PK).toBe("COMMUNITIES#COLLEGE");
    expect(cgsi1.GSI1SK).toBe("COMM-01");

    const ak = communityAlertKey("COMM-01", "ALT-01");
    expect(ak.PK).toBe("COMMUNITY#COMM-01");
    expect(ak.SK).toBe("ALERT#ALT-01");

    const agsi1 = communityAlertGsi1("OPEN", "2026-09-18T10:00:00Z");
    expect(agsi1.GSI1PK).toBe("ALERTS#OPEN");
    expect(agsi1.GSI1SK).toBe("2026-09-18T10:00:00Z");

    const agsi2 = communityAlertGsi2("REQ-2001", 1);
    expect(agsi2.GSI2PK).toBe("REQ#REQ-2001#ALERTS");
    expect(agsi2.GSI2SK).toBe("001");
  });
});

