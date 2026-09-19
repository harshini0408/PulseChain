/**
 * backend/tests/run-requisition-tests.ts
 *
 * Automated verification of all 17 criteria for Part 1 - Task 1:
 * Persistent Requisition Foundation.
 */

import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  isoNow,
  addHours,
  type Requisition,
  type AuditEvent,
} from "@pulsechain/shared";
import { getItem, queryAll } from "../src/lib/db.js";
import { handler as requisitionsHandler } from "../src/api/requisitions.js";

function mockEvent(params: {
  method: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  facilityId?: string;
  role?: string;
  userId?: string;
}): APIGatewayProxyEventV2 {
  const facilityId = params.facilityId ?? params.headers?.["x-facility-id"] ?? "FAC_CBE_KMCH";
  const role = params.role ?? params.headers?.["x-user-role"] ?? "HOSPITAL";
  const userId = params.userId ?? "USER_TEST_01";

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(params.headers ?? {}),
  };

  return {
    version: "2.0",
    routeKey: `${params.method} ${params.path}`,
    rawPath: params.path,
    rawQueryString: "",
    headers,
    queryStringParameters: params.queryStringParameters,
    pathParameters: params.pathParameters,
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
        userAgent: "test-runner",
      },
      requestId: "req-" + randomUUID(),
      routeKey: `${params.method} ${params.path}`,
      stage: "$default",
      time: isoNow(),
      timeEpoch: Date.now(),
      authorizer: {
        jwt: {
          claims: {
            "custom:facilityId": facilityId,
            "custom:role": role,
            sub: userId,
          },
          scopes: [],
        },
      } as any,
    },
    body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
    isBase64Encoded: false,
  };
}

async function runRequisitionTests() {
  console.log("===============================================================================");
  console.log("Starting Part 1 - Task 1: Persistent Requisition Acceptance Tests");
  console.log("===============================================================================");

  const FAC_A = "FAC_CBE_KMCH";
  const FAC_B = "FAC_CBE_PSGIMS";
  const requiredTime = addHours(isoNow(), 24);

  // ---------------------------------------------------------------------------
  // 1. Valid hospital requisition creation
  // ---------------------------------------------------------------------------
  console.log("\n[Test 1] Valid hospital requisition creation");
  const createEvt1 = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    role: "HOSPITAL",
    body: {
      component: "PLATELETS",
      bloodGroup: "O+",
      unitsRequested: 3,
      urgency: "HIGH",
      requiredBy: requiredTime,
    },
  });

  const res1 = (await requisitionsHandler(createEvt1)) as any;
  if (res1.statusCode !== 201) {
    throw new Error(`Expected 201 Created, got ${res1.statusCode}: ${res1.body}`);
  }
  const createdReq1: Requisition = JSON.parse(res1.body);
  if (!createdReq1.id || !createdReq1.reqId || createdReq1.unitsRequested !== 3) {
    throw new Error(`Malformed created requisition: ${JSON.stringify(createdReq1)}`);
  }
  if (createdReq1.facilityId !== FAC_A || createdReq1.hospitalId !== FAC_A) {
    throw new Error(`Facility mismatch in response: ${createdReq1.facilityId}`);
  }
  if (createdReq1.unitsFulfilled !== 0 || createdReq1.status !== "OPEN") {
    throw new Error(`Initial state mismatch: unitsFulfilled=${createdReq1.unitsFulfilled}, status=${createdReq1.status}`);
  }
  console.log(`✓ Requisition created successfully: ${createdReq1.id}`);

  // ---------------------------------------------------------------------------
  // 2. Requisition persisted in DynamoDB
  // ---------------------------------------------------------------------------
  console.log("\n[Test 2] Requisition persisted in DynamoDB");
  const dbItem = await getItem<any>(`REQ#${createdReq1.id}`, "META");
  if (!dbItem) {
    throw new Error(`Requisition ${createdReq1.id} was not found in DynamoDB table`);
  }
  if (dbItem.component !== "PLATELETS" || dbItem.bloodGroup !== "O+" || dbItem.unitsRequested !== 3) {
    throw new Error(`DynamoDB item data mismatch: ${JSON.stringify(dbItem)}`);
  }
  if (dbItem.GSI2PK !== `FACILITY#${FAC_A}#REQS`) {
    throw new Error(`DynamoDB GSI2PK mismatch: ${dbItem.GSI2PK}`);
  }
  console.log(`✓ Verified record in DynamoDB with PK=REQ#${createdReq1.id}, SK=META, GSI2PK=${dbItem.GSI2PK}`);

  // ---------------------------------------------------------------------------
  // 3. GET returns the persisted requisition
  // ---------------------------------------------------------------------------
  console.log("\n[Test 3] GET /requisitions returns the persisted requisition");
  const listEvt = mockEvent({
    method: "GET",
    path: "/requisitions",
    facilityId: FAC_A,
    role: "HOSPITAL",
  });
  const listRes = (await requisitionsHandler(listEvt)) as any;
  if (listRes.statusCode !== 200) {
    throw new Error(`Expected 200 OK from GET /requisitions, got ${listRes.statusCode}`);
  }
  const listData: Requisition[] = JSON.parse(listRes.body);
  const foundInList = listData.find((r) => r.id === createdReq1.id || r.reqId === createdReq1.id);
  if (!foundInList) {
    throw new Error(`Created requisition ${createdReq1.id} not returned in facility GET /requisitions`);
  }
  console.log(`✓ GET /requisitions returned ${listData.length} items including ${createdReq1.id}`);

  // ---------------------------------------------------------------------------
  // 4. GET /requisitions/{id} works
  // ---------------------------------------------------------------------------
  console.log("\n[Test 4] GET /requisitions/{id} works");
  const getByIdEvt = mockEvent({
    method: "GET",
    path: `/requisitions/${createdReq1.id}`,
    pathParameters: { id: createdReq1.id },
    facilityId: FAC_A,
    role: "HOSPITAL",
  });
  const getByIdRes = (await requisitionsHandler(getByIdEvt)) as any;
  if (getByIdRes.statusCode !== 200) {
    throw new Error(`Expected 200 OK from GET /requisitions/{id}, got ${getByIdRes.statusCode}`);
  }
  const singleReq: Requisition = JSON.parse(getByIdRes.body);
  if (singleReq.id !== createdReq1.id || singleReq.component !== "PLATELETS") {
    throw new Error(`Data mismatch on GET /requisitions/{id}: ${JSON.stringify(singleReq)}`);
  }
  console.log(`✓ GET /requisitions/${createdReq1.id} returned matching requisition`);

  // ---------------------------------------------------------------------------
  // 5. Browser/API reload does not destroy data
  // ---------------------------------------------------------------------------
  console.log("\n[Test 5] Browser/API reload does not destroy data (cold fetch)");
  const reloadEvt = mockEvent({
    method: "GET",
    path: "/requisitions",
    facilityId: FAC_A,
    role: "HOSPITAL",
  });
  const reloadRes = (await requisitionsHandler(reloadEvt)) as any;
  const reloadData: Requisition[] = JSON.parse(reloadRes.body);
  const survivedReload = reloadData.some((r) => r.id === createdReq1.id);
  if (!survivedReload) {
    throw new Error(`Requisition did not survive subsequent request!`);
  }
  console.log(`✓ Independent query confirms data persists across sessions`);

  // ---------------------------------------------------------------------------
  // 6. Non-HOSPITAL unauthorized creation is rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 6] Non-HOSPITAL unauthorized creation is rejected");
  const nonHospEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    role: "DONOR",
    body: {
      component: "RBC",
      bloodGroup: "A+",
      unitsRequested: 1,
      requiredBy: requiredTime,
    },
  });
  const nonHospRes = (await requisitionsHandler(nonHospEvt)) as any;
  if (nonHospRes.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for role DONOR, got ${nonHospRes.statusCode}`);
  }
  console.log(`✓ Role DONOR rejected with 403 Forbidden`);

  // ---------------------------------------------------------------------------
  // 7. Facility A cannot create a requisition as Facility B
  // ---------------------------------------------------------------------------
  console.log("\n[Test 7] Facility A cannot create a requisition as Facility B (spoofing prevented)");
  const spoofEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A, // authenticated as Facility A
    role: "HOSPITAL",
    body: {
      hospitalId: FAC_B, // attempting to claim Facility B in body
      component: "PLASMA",
      bloodGroup: "B+",
      unitsRequested: 2,
      requiredBy: requiredTime,
    },
  });
  const spoofRes = (await requisitionsHandler(spoofEvt)) as any;
  if (spoofRes.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for facility mismatch, got ${spoofRes.statusCode}`);
  }
  console.log(`✓ Facility mismatch rejected with 403 Forbidden`);

  // ---------------------------------------------------------------------------
  // 8. Facility A cannot read Facility B's requisition
  // ---------------------------------------------------------------------------
  console.log("\n[Test 8] Facility A cannot read Facility B's requisition");
  // First create a requisition as Facility B
  const facBCreate = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_B,
    role: "HOSPITAL",
    body: {
      component: "RBC",
      bloodGroup: "AB-",
      unitsRequested: 1,
      requiredBy: requiredTime,
    },
  });
  const facBRes = (await requisitionsHandler(facBCreate)) as any;
  const reqB: Requisition = JSON.parse(facBRes.body);

  // Facility A attempts to read Facility B's requisition by ID
  const crossReadEvt = mockEvent({
    method: "GET",
    path: `/requisitions/${reqB.id}`,
    pathParameters: { id: reqB.id },
    facilityId: FAC_A, // authenticated as Facility A
    role: "HOSPITAL",
  });
  const crossReadRes = (await requisitionsHandler(crossReadEvt)) as any;
  if (crossReadRes.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-facility read, got ${crossReadRes.statusCode}`);
  }

  // Facility A attempts to query Facility B's requisitions
  const crossQueryEvt = mockEvent({
    method: "GET",
    path: `/requisitions`,
    queryStringParameters: { hospitalId: FAC_B },
    facilityId: FAC_A,
    role: "HOSPITAL",
  });
  const crossQueryRes = (await requisitionsHandler(crossQueryEvt)) as any;
  if (crossQueryRes.statusCode !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-facility query, got ${crossQueryRes.statusCode}`);
  }
  console.log(`✓ Cross-facility single read and query both rejected with 403 Forbidden`);

  // ---------------------------------------------------------------------------
  // 9. Invalid blood group rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 9] Invalid blood group rejected");
  const badGroupEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "PLATELETS",
      bloodGroup: "INVALID_GROUP",
      unitsRequested: 1,
      requiredBy: requiredTime,
    },
  });
  const badGroupRes = (await requisitionsHandler(badGroupEvt)) as any;
  if (badGroupRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid bloodGroup, got ${badGroupRes.statusCode}`);
  }
  console.log(`✓ Invalid blood group rejected with 400`);

  // ---------------------------------------------------------------------------
  // 10. Invalid component rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 10] Invalid component rejected");
  const badCompEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "WHOLE_BLOOD_INVALID",
      bloodGroup: "O+",
      unitsRequested: 1,
      requiredBy: requiredTime,
    },
  });
  const badCompRes = (await requisitionsHandler(badCompEvt)) as any;
  if (badCompRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid component, got ${badCompRes.statusCode}`);
  }
  console.log(`✓ Invalid component rejected with 400`);

  // ---------------------------------------------------------------------------
  // 11. Invalid urgency rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 11] Invalid urgency rejected");
  const badUrgEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: 1,
      urgency: "SUPER_EMERGENCY_INVALID",
      requiredBy: requiredTime,
    },
  });
  const badUrgRes = (await requisitionsHandler(badUrgEvt)) as any;
  if (badUrgRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid urgency, got ${badUrgRes.statusCode}`);
  }
  console.log(`✓ Invalid urgency rejected with 400`);

  // ---------------------------------------------------------------------------
  // 12. unitsRequested = 0 rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 12] unitsRequested = 0 rejected");
  const zeroUnitsEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: 0,
      requiredBy: requiredTime,
    },
  });
  const zeroUnitsRes = (await requisitionsHandler(zeroUnitsEvt)) as any;
  if (zeroUnitsRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for unitsRequested=0, got ${zeroUnitsRes.statusCode}`);
  }
  console.log(`✓ unitsRequested = 0 rejected with 400`);

  // ---------------------------------------------------------------------------
  // 13. negative unitsRequested rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 13] negative unitsRequested rejected");
  const negUnitsEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: -5,
      requiredBy: requiredTime,
    },
  });
  const negUnitsRes = (await requisitionsHandler(negUnitsEvt)) as any;
  if (negUnitsRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for negative unitsRequested, got ${negUnitsRes.statusCode}`);
  }
  console.log(`✓ negative unitsRequested rejected with 400`);

  // ---------------------------------------------------------------------------
  // 14. malformed requiredBy rejected
  // ---------------------------------------------------------------------------
  console.log("\n[Test 14] malformed requiredBy rejected");
  const badTimeEvt = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    body: {
      component: "RBC",
      bloodGroup: "O+",
      unitsRequested: 2,
      requiredBy: "tomorrow-afternoon",
    },
  });
  const badTimeRes = (await requisitionsHandler(badTimeEvt)) as any;
  if (badTimeRes.statusCode !== 400) {
    throw new Error(`Expected 400 Bad Request for malformed requiredBy, got ${badTimeRes.statusCode}`);
  }
  console.log(`✓ malformed requiredBy rejected with 400`);

  // ---------------------------------------------------------------------------
  // 15. duplicate Idempotency-Key does not create a second requisition
  // ---------------------------------------------------------------------------
  console.log("\n[Test 15] Duplicate Idempotency-Key does not create a second requisition");
  const testIdempKey = "IDEMP_" + randomUUID();
  const idempReqBody = {
    component: "PLASMA",
    bloodGroup: "AB+",
    unitsRequested: 4,
    urgency: "NORMAL",
    requiredBy: requiredTime,
  };

  const idempEvt1 = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    headers: { "Idempotency-Key": testIdempKey },
    body: idempReqBody,
  });

  const idempRes1 = (await requisitionsHandler(idempEvt1)) as any;
  if (idempRes1.statusCode !== 201) {
    throw new Error(`Expected 201 on first idempotent POST, got ${idempRes1.statusCode}`);
  }
  const idempReq1: Requisition = JSON.parse(idempRes1.body);

  // Repeat POST with identical Idempotency-Key
  const idempEvt2 = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    headers: { "Idempotency-Key": testIdempKey },
    body: idempReqBody,
  });

  const idempRes2 = (await requisitionsHandler(idempEvt2)) as any;
  if (idempRes2.statusCode !== 200 && idempRes2.statusCode !== 201) {
    throw new Error(`Expected 200/201 on replay idempotent POST, got ${idempRes2.statusCode}`);
  }
  const idempReq2: Requisition = JSON.parse(idempRes2.body);

  if (idempReq1.id !== idempReq2.id) {
    throw new Error(`Duplicate requisition was created! First ID=${idempReq1.id}, Second ID=${idempReq2.id}`);
  }
  console.log(`✓ Replaying with same Idempotency-Key returned identical requisition ID: ${idempReq1.id}`);

  // ---------------------------------------------------------------------------
  // 16. different Idempotency-Key can create a second legitimate requisition
  // ---------------------------------------------------------------------------
  console.log("\n[Test 16] Different Idempotency-Key creates a new legitimate requisition");
  const differentIdempKey = "IDEMP_" + randomUUID();
  const idempEvt3 = mockEvent({
    method: "POST",
    path: "/requisitions",
    facilityId: FAC_A,
    headers: { "Idempotency-Key": differentIdempKey },
    body: idempReqBody,
  });
  const idempRes3 = (await requisitionsHandler(idempEvt3)) as any;
  if (idempRes3.statusCode !== 201) {
    throw new Error(`Expected 201 for different idempotency key, got ${idempRes3.statusCode}`);
  }
  const idempReq3: Requisition = JSON.parse(idempRes3.body);
  if (idempReq3.id === idempReq1.id) {
    throw new Error(`Expected different requisition ID for new key, got same ID`);
  }
  console.log(`✓ New Idempotency-Key produced distinct requisition ID: ${idempReq3.id}`);

  // ---------------------------------------------------------------------------
  // 17. REQUISITION_CREATED audit record exists
  // ---------------------------------------------------------------------------
  console.log("\n[Test 17] REQUISITION_CREATED audit record exists");
  const auditRecords = await queryAll<AuditEvent>({
    keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
    values: {
      ":pk": `REQ#${createdReq1.id}`,
      ":skPrefix": "AUDIT#",
    },
  });

  if (!auditRecords || auditRecords.length === 0) {
    throw new Error(`No audit records found under PK=REQ#${createdReq1.id}`);
  }

  const createdAuditEvent = auditRecords.find((a) => a.eventType === "REQUISITION_CREATED");
  if (!createdAuditEvent) {
    throw new Error(`REQUISITION_CREATED event not found in audit trail for ${createdReq1.id}`);
  }
  if (createdAuditEvent.actorFacilityId !== FAC_A) {
    throw new Error(`Audit actor facility mismatch: ${createdAuditEvent.actorFacilityId}`);
  }
  console.log(`✓ REQUISITION_CREATED audit event verified with eventId=${createdAuditEvent.eventId}`);

  console.log("\n===============================================================================");
  console.log("ALL 17 REQUISITION FOUNDATION ACCEPTANCE TESTS PASSED PERFECTLY!");
  console.log("===============================================================================");
}

runRequisitionTests().catch((err) => {
  console.error("\n❌ Requisition acceptance test suite failed:", err);
  process.exit(1);
});
