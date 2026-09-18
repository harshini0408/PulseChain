/**
 * seed/src/audit-section3.ts
 *
 * Runs all execution and query checks for Section 3 (Seed data) against live DynamoDB.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { reset } from "./reset.js";
import { haversineKm } from "./distances-util.js";

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME ?? "PulseChain";

async function runSection3Audit() {
  console.log("=== Section 3 Audit (Querying live ap-south-1 Table) ===");

  // 3.1 — Scan table and count items by entityType
  const allItems: any[] = [];
  let lastKey: any = undefined;
  do {
    const res: any = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastKey,
      })
    );
    if (res.Items) allItems.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  console.log(`\n3.1 — Total Item Count in ${TABLE_NAME}: ${allItems.length}`);
  const typeCounts: Record<string, number> = {};
  for (const item of allItems) {
    const type = item.entityType || (item.SK?.startsWith("DIST#") ? "DISTANCE" : "UNKNOWN");
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  console.log("Item count by entityType:", typeCounts);

  // 3.2 — Facilities are real
  const facilities = allItems.filter((i) => i.entityType === "FACILITY");
  console.log(`\n3.2 — Facilities Count: ${facilities.length}`);
  const outsideCorridor: any[] = [];
  for (const f of facilities) {
    const validCoords = f.lat >= 10.8 && f.lat <= 11.6 && f.lng >= 76.8 && f.lng <= 77.9;
    if (!validCoords) outsideCorridor.push(f);
    console.log(`  - ${f.facilityId}: ${f.name} (${f.city}) @ [${f.lat}, ${f.lng}]`);
  }
  console.log(`Facilities outside corridor: ${outsideCorridor.length}`);

  // 3.3 — Ring distribution for 3 origins
  console.log("\n3.3 — Ring Distribution for 3 Origin Facilities:");
  const testOrigins = ["FAC_CBE_SNBC", "FAC_CBE_RBANKS", "FAC_TUP_GH"];
  for (const oId of testOrigins) {
    const origin = facilities.find((f) => f.facilityId === oId);
    if (!origin) continue;
    let r1 = 0, r2 = 0, rReg = 0;
    for (const f of facilities) {
      if (f.facilityId === oId) continue;
      const km = haversineKm(origin.lat, origin.lng, f.lat, f.lng);
      if (km <= 10) r1++;
      else if (km <= 30) r2++;
      else rReg++;
    }
    console.log(`  Origin ${origin.name} (${oId}): Ring 1 (<=10km)=${r1}, Ring 2 (10-30km)=${r2}, Regional (>30km)=${rReg}`);
  }

  // 3.4 — Distance sort keys
  console.log("\n3.4 — Distance Sort Keys Inspection:");
  const allDistances = allItems.filter((i) => i.SK?.startsWith("DIST#"));
  console.log(`Total DIST# items: ${allDistances.length}`);
  console.log(`Sample 5 DIST# SKs:`, allDistances.slice(0, 5).map((d) => `${d.PK} -> ${d.SK} (${d.distanceKm} km)`));
  const badPadding = allDistances.filter((d) => !/^DIST#\d{3}\.\d#/.test(d.SK));
  console.log(`Distances with invalid zero-padding: ${badPadding.length}`);
  const sampleDist = allDistances[0];
  if (sampleDist) {
    const fromId = sampleDist.PK.replace("FACILITY#", "");
    const toId = sampleDist.toFacilityId;
    const reverse = allDistances.find((d) => d.PK === `FACILITY#${toId}` && d.toFacilityId === fromId);
    console.log(`Bidirectional check (${fromId} <-> ${toId}): reverse exists? ${!!reverse}`);
  }

  // 3.5 — Expiry spread (histogram platelet units)
  console.log("\n3.5 — Platelet Expiry Spread Histogram:");
  const now = new Date();
  const platelets = allItems.filter((i) => i.entityType === "UNIT" && i.component === "PLATELETS");
  const buckets: Record<string, number> = { "<0": 0, "0-12": 0, "12-24": 0, "24-48": 0, "48-72": 0, "72+": 0 };
  for (const u of platelets) {
    const hours = (new Date(u.expiresAt).getTime() - now.getTime()) / (3600 * 1000);
    if (hours < 0) buckets["<0"]++;
    else if (hours <= 12) buckets["0-12"]++;
    else if (hours <= 24) buckets["12-24"]++;
    else if (hours <= 48) buckets["24-48"]++;
    else if (hours <= 72) buckets["48-72"]++;
    else buckets["72+"]++;
  }
  console.log(`Total Platelet Units: ${platelets.length}`);
  console.log("Hours to expiry buckets:", buckets);
  const straddles48h = buckets["24-48"] > 0 && buckets["48-72"] > 0;
  console.log(`Straddles 48h boundary? ${straddles48h}`);

  // 3.6 — Blood group distribution
  console.log("\n3.6 — Blood Group Distribution across all units:");
  const allUnits = allItems.filter((i) => i.entityType === "UNIT");
  const bgCounts: Record<string, number> = {};
  for (const u of allUnits) {
    bgCounts[u.bloodGroup] = (bgCounts[u.bloodGroup] || 0) + 1;
  }
  console.log("Total units:", allUnits.length, "Group counts:", bgCounts);

  // 3.7 — Requisitions
  console.log("\n3.7 — Open Requisitions:");
  const reqs = allItems.filter((i) => i.entityType === "REQUISITION");
  console.log(`Total Requisitions: ${reqs.length}`);
  const openPltReqs = reqs.filter((r) => r.status === "OPEN" && r.component === "PLATELETS");
  console.log(`Open Platelet Requisitions (${openPltReqs.length}):`);
  for (const r of openPltReqs) {
    console.log(`  - ${r.reqId}: Hospital=${r.hospitalId}, Group=${r.bloodGroup}, Units=${r.unitsRequested}, Urgency=${r.urgency}`);
  }

  // 3.8 — Stats history
  console.log("\n3.8 — Stats History:");
  const stats = allItems.filter((i) => i.PK === "STATS" && i.SK?.startsWith("DAY#"));
  console.log(`Stats Day items count: ${stats.length}`);
  let totalSaved = 0, totalLost = 0;
  for (const s of stats) {
    totalSaved += s.unitsSaved || 0;
    totalLost += s.unitsLost || 0;
  }
  const totalUnits = totalSaved + totalLost;
  const lossRate = totalUnits > 0 ? (totalLost / totalUnits) * 100 : 0;
  console.log(`Total saved: ${totalSaved}, Total lost: ${totalLost}, Total: ${totalUnits}`);
  console.log(`Implied loss rate: ${lossRate.toFixed(2)}% (Target: ~11-13%, flag if <8%)`);

  // 3.9 — Staged units check
  console.log("\n3.9 — Staged Demo Units:");
  const unit1 = allItems.find((i) => i.unitId === "DEMO_UNIT_CLAIM_001");
  const unit2 = allItems.find((i) => i.unitId === "DEMO_UNIT_ESC_001");
  console.log(`Unit 1 (DEMO_UNIT_CLAIM_001) exists? ${!!unit1}, Facility=${unit1?.facilityId}, Status=${unit1?.status}, Group=${unit1?.bloodGroup}`);
  console.log(`Unit 2 (DEMO_UNIT_ESC_001) exists? ${!!unit2}, Facility=${unit2?.facilityId}, Status=${unit2?.status}, Group=${unit2?.bloodGroup}`);

  if (unit2) {
    const origin2 = facilities.find((f) => f.facilityId === unit2.facilityId);
    if (origin2) {
      const ring1Neighbours = facilities
        .filter((f) => f.facilityId !== origin2.facilityId)
        .filter((f) => haversineKm(origin2.lat, origin2.lng, f.lat, f.lng) <= 10)
        .filter((f) => f.components.includes("PLATELETS"));
      console.log(`Unit 2 ring-1 platelets-capable neighbours (${ring1Neighbours.length}):`, ring1Neighbours.map((f) => f.facilityId));
    }
  }

  // 3.10 — Reset timing test
  console.log("\n3.10 — Reset Idempotency & Performance Test:");
  console.log("Running reset run 1...");
  const t0 = Date.now();
  const res1 = await reset();
  const elapsed1 = (Date.now() - t0) / 1000;
  console.log(`Reset 1 complete in ${elapsed1.toFixed(2)}s: expected=${res1.expectedCount}, actual=${res1.actualCount}`);

  console.log("Running reset run 2...");
  const t1 = Date.now();
  const res2 = await reset();
  const elapsed2 = (Date.now() - t1) / 1000;
  console.log(`Reset 2 complete in ${elapsed2.toFixed(2)}s: expected=${res2.expectedCount}, actual=${res2.actualCount}`);
  console.log(`Counts match? ${res1.actualCount === res2.actualCount}, Under 60s? ${elapsed1 < 60 && elapsed2 < 60}`);
}

runSection3Audit().catch((err) => console.error("Error in section 3 audit:", err));
