/**
 * backend/tests/verify-block1.ts
 *
 * Verification suite for Block 1 — Requisition Engine Wiring & Atomic Reservation.
 */

import { randomUUID } from "crypto";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  unitKey,
  requisitionKey,
  queuePartition,
  isoNow,
  addHours,
  type BloodUnit,
  type Requisition,
  type AuditEvent,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll } from "../src/lib/db.js";
import { docClient, requireTableName } from "../src/lib/db.js";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { handler as requisitionsHandler } from "../src/api/requisitions.js";
import { searchRequisitionInventory } from "../src/workers/requisition-search.js";

async function deleteRecord(pk: string, sk: string) {
  await docClient.send(
    new DeleteCommand({
      TableName: requireTableName(),
      Key: { PK: pk, SK: sk },
    }),
  );
}

function mockEvent(params: {
  method: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: `${params.method} ${params.path}`,
    rawPath: params.path,
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
      ...(params.headers ?? {}),
    },
    queryStringParameters: params.queryStringParameters,
    pathParameters: params.pathParameters,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "testapi",
      domainName: "test.execute-api.ap-south-1.amazonaws.com",
      domainPrefix: "test",
      http: {
        method: params.method,
        path: params.path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: randomUUID(),
      routeKey: `${params.method} ${params.path}`,
      stage: "$default",
      time: isoNow(),
      timeEpoch: Date.now(),
    } as any,
  };
}

async function run() {
  console.log("=================================================");
  console.log("BLOCK 1 VERIFICATION: REQUISITION ENGINE");
  console.log("=================================================");

  const testHospitalId = "FAC_CBE_KMCH";
  const now = isoNow();

  // Query existing available count for Plasma AB-
  // (Plasma AB- is very rare, so we can isolate perfectly)
  const comp = "PLASMA";
  const group = "AB-";

  const existingUnits = await queryAll<BloodUnit & { GSI1PK: string; GSI1SK: string }>({
    indexName: "GSI1",
    keyCondition: "GSI1PK = :pk",
    values: {
      ":pk": queuePartition("AVAILABLE", comp),
    },
  });
  const matchingInitial = existingUnits.filter((u) => u.bloodGroup === group && u.status === "AVAILABLE");
  console.log(`Found ${matchingInitial.length} existing available ${comp} ${group} units in network.`);

  // We request matchingInitial.length + 1 units to verify PARTIAL first, then add 1 unit to verify FILLED!
  const targetUnits = matchingInitial.length + 1;

  const testReqPayload = {
    hospitalId: testHospitalId,
    component: comp,
    bloodGroup: group,
    unitsRequested: targetUnits,
    urgency: "HIGH",
    neededBy: addHours(now, 24),
    source: "MANUAL",
    rawText: `Urgent need for ${targetUnits} units of ${group} ${comp}`,
  };

  let createdReqId = "";
  const createdUnitIds: string[] = [];

  try {
    // ─── Test 1: POST /requisitions ─────────────────────────────────────────
    console.log("\n[Test 1] Testing POST /requisitions...");
    const postRes = await requisitionsHandler(
      mockEvent({
        method: "POST",
        path: "/requisitions",
        body: testReqPayload,
      }),
    );

    if (postRes.statusCode !== 201) {
      throw new Error(`Expected status 201, got ${postRes.statusCode}: ${postRes.body}`);
    }

    const createdReq = JSON.parse(postRes.body as string) as Requisition;
    createdReqId = createdReq.reqId;

    if (!createdReqId.startsWith("RQ")) {
      throw new Error(`Invalid reqId generated: ${createdReqId}`);
    }
    if (createdReq.unitsRequested !== targetUnits || createdReq.unitsFilled !== 0 || createdReq.status !== "OPEN") {
      throw new Error(`Invalid requisition initial fields: ${JSON.stringify(createdReq)}`);
    }
    console.log(`✓ POST /requisitions returned 201 with reqId: ${createdReqId}`);

    // Verify item in DynamoDB
    const dbReq = await getItem<Requisition>(`REQ#${createdReqId}`, "META");
    if (!dbReq || dbReq.reqId !== createdReqId) {
      throw new Error(`Requisition not found in DynamoDB`);
    }
    console.log("✓ Requisition verified in DynamoDB");

    // Verify REQUISITION_CREATED audit event
    const auditCreatedHits = await queryAll<AuditEvent & { SK: string }>({
      keyCondition: "PK = :pk AND begins_with(SK, :prefix)",
      values: {
        ":pk": `REQ#${createdReqId}`,
        ":prefix": "AUDIT#",
      },
    });
    const createdEvent = auditCreatedHits.find((a) => a.eventType === "REQUISITION_CREATED");
    if (!createdEvent) {
      throw new Error(`REQUISITION_CREATED audit event not found for ${createdReqId}`);
    }
    console.log("✓ REQUISITION_CREATED audit event verified in table");

    // ─── Test 2: GET /requisitions?hospitalId=... ───────────────────────────
    console.log("\n[Test 2] Testing GET /requisitions?hospitalId=...");
    const getHospitalRes = await requisitionsHandler(
      mockEvent({
        method: "GET",
        path: "/requisitions",
        queryStringParameters: { hospitalId: testHospitalId },
      }),
    );

    if (getHospitalRes.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getHospitalRes.statusCode}: ${getHospitalRes.body}`);
    }

    const hospitalReqs = JSON.parse(getHospitalRes.body as string) as Requisition[];
    const foundHospitalReq = hospitalReqs.find((r) => r.reqId === createdReqId);
    if (!foundHospitalReq) {
      throw new Error(`Created requisition not found in GET by hospitalId`);
    }
    console.log(`✓ Requisition found via GSI2 FACILITY#<id>#REQS`);

    // ─── Test 3: GET /requisitions?status=OPEN ──────────────────────────────
    console.log("\n[Test 3] Testing GET /requisitions?status=OPEN...");
    const getOpenRes = await requisitionsHandler(
      mockEvent({
        method: "GET",
        path: "/requisitions",
        queryStringParameters: { status: "OPEN", component: comp },
      }),
    );

    if (getOpenRes.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getOpenRes.statusCode}: ${getOpenRes.body}`);
    }

    const openReqs = JSON.parse(getOpenRes.body as string) as Requisition[];
    const foundOpenReq = openReqs.find((r) => r.reqId === createdReqId);
    if (!foundOpenReq) {
      throw new Error(`Created requisition not found in GET status=OPEN`);
    }
    console.log(`✓ Requisition found via GSI1 OPENREQ#${comp}`);

    // ─── Test 4: Partial Reservation via requisition-search ─────────────────
    console.log("\n[Test 4] Testing atomic partial reservation worker (TransactWriteItems)...");
    const searchRes1 = await searchRequisitionInventory({
      requisitionId: createdReqId,
      hospitalId: testHospitalId,
      component: comp,
      bloodGroup: group,
      unitsRequested: targetUnits,
      now,
    });

    console.log("Search result 1 (Initial network search):", {
      unitsFilled: searchRes1.unitsFilled,
      unitsRequestedShortfall: searchRes1.unitsRequested,
      status: searchRes1.status,
      filled: searchRes1.filled,
    });

    // Since targetUnits = matchingInitial.length + 1, it must be PARTIAL (or OPEN if 0 initial) with filled: false
    const expectedStatus = matchingInitial.length > 0 ? "PARTIAL" : "OPEN";
    if (searchRes1.filled !== false || searchRes1.status !== expectedStatus || searchRes1.unitsRequested !== 1) {
      throw new Error(`Expected status: ${expectedStatus}, filled: false, shortfall: 1. Got: ${JSON.stringify(searchRes1)}`);
    }
    console.log(`✓ Shortfall correctly calculated: 1 unit needed, continues to donor tier with filled=false`);

    // ─── Test 5: Complete Reservation via requisition-search ────────────────
    console.log("\n[Test 5] Seeding final unit and verifying complete fulfillment (FILLED)...");
    const finalUnitId = `TEST_UNIT_${randomUUID().slice(0, 8)}`;
    createdUnitIds.push(finalUnitId);

    const finalUnit: BloodUnit & Record<string, unknown> = {
      ...unitKey(finalUnitId),
      GSI1PK: queuePartition("AVAILABLE", comp),
      GSI1SK: addHours(now, 20),
      GSI2PK: `FACILITY#FAC_CBE_GH#STOCK`,
      GSI2SK: addHours(now, 20),
      entityType: "UNIT",
      unitId: finalUnitId,
      facilityId: "FAC_CBE_GH",
      component: comp,
      bloodGroup: group,
      volumeMl: 250,
      valueInr: 1500,
      collectedAt: now,
      expiresAt: addHours(now, 20),
      status: "AVAILABLE",
      version: 1,
    };
    await putItem(finalUnit);

    const searchRes2 = await searchRequisitionInventory({
      requisitionId: createdReqId,
      hospitalId: testHospitalId,
      component: comp,
      bloodGroup: group,
      unitsRequested: targetUnits,
      now,
    });

    console.log("Search result 2 (After stock added):", {
      unitsFilled: searchRes2.unitsFilled,
      unitsRequestedShortfall: searchRes2.unitsRequested,
      status: searchRes2.status,
      filled: searchRes2.filled,
    });

    if (searchRes2.filled !== true || searchRes2.status !== "FILLED" || searchRes2.unitsFilled !== targetUnits) {
      throw new Error(`Expected status: FILLED, filled: true, unitsFilled: ${targetUnits}. Got: ${JSON.stringify(searchRes2)}`);
    }

    // Verify unit was transitioned to CLAIMED
    const dbFinalUnit = await getItem<BloodUnit>(`UNIT#${finalUnitId}`, "META");
    if (dbFinalUnit?.status !== "CLAIMED" || dbFinalUnit?.claimedBy !== testHospitalId) {
      throw new Error(`Unit ${finalUnitId} was not transitioned to CLAIMED by ${testHospitalId}: ${JSON.stringify(dbFinalUnit)}`);
    }
    console.log(`✓ Unit ${finalUnitId} is CLAIMED with claimedBy: ${testHospitalId}`);

    // Verify Requisition is FILLED in DynamoDB
    const dbReqFinal = await getItem<Requisition>(`REQ#${createdReqId}`, "META");
    if (dbReqFinal?.status !== "FILLED" || dbReqFinal?.unitsFilled !== targetUnits) {
      throw new Error(`Requisition not marked FILLED in DynamoDB: ${JSON.stringify(dbReqFinal)}`);
    }
    console.log(`✓ Requisition ${createdReqId} is FILLED with unitsFilled: ${targetUnits}`);

    // Verify REQUISITION_FILLED audit event exists
    const auditHits = await queryAll<AuditEvent & { SK: string }>({
      keyCondition: "PK = :pk AND begins_with(SK, :prefix)",
      values: {
        ":pk": `REQ#${createdReqId}`,
        ":prefix": "AUDIT#",
      },
    });

    const filledEvent = auditHits.find((a) => a.eventType === "REQUISITION_FILLED");
    if (!filledEvent) {
      throw new Error(`REQUISITION_FILLED audit event not found for ${createdReqId}`);
    }
    console.log(`✓ REQUISITION_FILLED audit event verified in table`);

    console.log("\n=================================================");
    console.log("ALL 5 BLOCK 1 VERIFICATION CHECKS PASSED!");
    console.log("=================================================");
  } finally {
    // Cleanup created test records
    if (createdReqId) {
      try {
        await deleteRecord(`REQ#${createdReqId}`, "META");
      } catch {}
    }
    for (const uId of createdUnitIds) {
      try {
        await deleteRecord(`UNIT#${uId}`, "META");
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
