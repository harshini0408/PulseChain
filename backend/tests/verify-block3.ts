/**
 * backend/tests/verify-block3.ts
 *
 * Verification suite for Block 3 — Communication: Secure Community Mobilisation Link.
 *
 * Tests:
 * 1. Token Creation & Public GET:
 *    - Unauthenticated GET /mobilise/{token} returns minimal MobilisationSummary.
 *    - Verifies NO donor data, internal scoring, or patient data is returned.
 * 2. Expired Token Handling:
 *    - When expiresAt < now, GET /mobilise/{token} conditionally transitions DB status to EXPIRED.
 *    - Validates DB record is updated to EXPIRED, not left as PENDING.
 * 3. Atomic Acknowledgement:
 *    - POST /mobilise/{token}/acknowledge executes atomic DynamoDB transaction.
 *    - Verifies token status = ACKNOWLEDGED.
 *    - Verifies pool record lastMobilisedAt is updated and lastMobilisationStatus = ACKNOWLEDGED.
 *    - Verifies MOBILISATION_ACKNOWLEDGED audit record is written.
 * 4. Double Acknowledgement Rejection:
 *    - Subsequent POST /mobilise/{token}/acknowledge returns 409 Conflict.
 * 5. Invalid Token Handling:
 *    - Non-existent token returns 404 Not Found.
 */

import { randomUUID, randomBytes } from "crypto";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  mobilisationKey,
  poolKey,
  auditKey,
  isoNow,
  addHours,
  type MobilisationRecord,
  type MobilisationSummary,
  type DonorPool,
  type AuditEvent,
} from "@pulsechain/shared";
import { getItem, putItem, queryAll, docClient, requireTableName } from "../src/lib/db.js";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { handler as mobilisationsHandler } from "../src/api/mobilisations.js";

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
    queryStringParameters: undefined,
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
        userAgent: "VerificationTest/1.0",
      },
      requestId: randomUUID(),
      routeKey: `${params.method} ${params.path}`,
      stage: "$default",
      time: isoNow(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

async function runVerification() {
  console.log("=== STARTING BLOCK 3 VERIFICATION SUITE ===\n");
  const testId = randomUUID().slice(0, 8);
  const poolId = `POOL_TEST_${testId}`;
  const requisitionId = `REQ_TEST_${testId}`;
  const validToken = randomBytes(32).toString("hex");
  const expiredToken = randomBytes(32).toString("hex");

  const recordsToDelete: Array<{ pk: string; sk: string }> = [];

  try {
    // 0. Seed Donor Pool
    const testPool: DonorPool = {
      poolId,
      name: "KMCH NSS Volunteer Corps",
      type: "COLLEGE",
      city: "Coimbatore",
      location: { lat: 11.0168, lng: 76.9558 },
      contactName: "Dr. K. Swaminathan",
      contactEmail: "nss@kmch.example.invalid",
      registeredCount: 150,
      groupCounts: { "O-": 25, "O+": 50, "A+": 75 },
      lastMobilisedAt: null,
      lastMobilisationStatus: null,
      createdAt: isoNow(),
    };
    await putItem({ ...poolKey(poolId), ...testPool });
    recordsToDelete.push(poolKey(poolId));
    console.log(`✓ Seeded test donor pool: ${poolId}`);

    // 1. Seed Active Mobilisation Record
    const validMobilisation: MobilisationRecord = {
      token: validToken,
      poolId,
      poolName: testPool.name,
      poolCity: testPool.city,
      requisitionId,
      hospitalName: "KMCH Speciality Hospital",
      hospitalCity: "Coimbatore",
      component: "PLATELETS",
      bloodGroup: "O-",
      unitsRequired: 2,
      urgency: "CRITICAL",
      status: "PENDING",
      createdAt: isoNow(),
      expiresAt: addHours(isoNow(), 24),
    };
    await putItem({ ...mobilisationKey(validToken), ...validMobilisation });
    recordsToDelete.push(mobilisationKey(validToken));
    console.log(`✓ Seeded active mobilisation record: ${validToken.slice(0, 12)}...`);

    // 2. Seed Expired Mobilisation Record
    const expiredMobilisation: MobilisationRecord = {
      token: expiredToken,
      poolId,
      poolName: testPool.name,
      poolCity: testPool.city,
      requisitionId,
      hospitalName: "KMCH Speciality Hospital",
      hospitalCity: "Coimbatore",
      component: "PLATELETS",
      bloodGroup: "O-",
      unitsRequired: 1,
      urgency: "HIGH",
      status: "PENDING", // seeded as pending to test transition on read
      createdAt: addHours(isoNow(), -48),
      expiresAt: addHours(isoNow(), -24),
    };
    await putItem({ ...mobilisationKey(expiredToken), ...expiredMobilisation });
    recordsToDelete.push(mobilisationKey(expiredToken));
    console.log(`✓ Seeded expired mobilisation record: ${expiredToken.slice(0, 12)}...`);

    // TEST 1: GET /mobilise/{token} (Active Token)
    console.log("\n--- TEST 1: GET /mobilise/{token} (Active Token) ---");
    const getRes1 = await mobilisationsHandler(
      mockEvent({
        method: "GET",
        path: `/mobilise/${validToken}`,
        pathParameters: { token: validToken },
      }),
    );
    if (getRes1.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getRes1.statusCode}: ${getRes1.body}`);
    }
    const body1: MobilisationSummary = JSON.parse(getRes1.body);
    if (body1.status !== "PENDING") {
      throw new Error(`Expected status PENDING, got ${body1.status}`);
    }
    if (body1.hospitalName !== "KMCH Speciality Hospital") {
      throw new Error(`Unexpected hospitalName: ${body1.hospitalName}`);
    }
    // Verify minimal public payload (no patient data, no internal pool objects, no donor directories)
    const rawKeys = Object.keys(body1);
    const forbiddenKeys = ["donors", "internalScore", "patientName", "patientId", "registeredCount", "contactEmail"];
    for (const key of forbiddenKeys) {
      if (rawKeys.includes(key)) {
        throw new Error(`Security violation: Public response exposes '${key}'!`);
      }
    }
    console.log("✓ GET /mobilise/{token} returned 200 with minimal public MobilisationSummary");

    // TEST 2: GET /mobilise/{token} (Expired Token Transition)
    console.log("\n--- TEST 2: GET /mobilise/{token} (Expired Token Handling) ---");
    const getResExpired = await mobilisationsHandler(
      mockEvent({
        method: "GET",
        path: `/mobilise/${expiredToken}`,
        pathParameters: { token: expiredToken },
      }),
    );
    if (getResExpired.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getResExpired.statusCode}: ${getResExpired.body}`);
    }
    const bodyExpired: MobilisationSummary = JSON.parse(getResExpired.body);
    if (bodyExpired.status !== "EXPIRED") {
      throw new Error(`Expected status EXPIRED in response, got ${bodyExpired.status}`);
    }
    // Verify DB item was explicitly transitioned to EXPIRED
    const expKey = mobilisationKey(expiredToken);
    const dbExpiredItem = await getItem<MobilisationRecord>(expKey.PK, expKey.SK);
    if (dbExpiredItem?.status !== "EXPIRED") {
      throw new Error(`Expected DB record status EXPIRED, but was ${dbExpiredItem?.status}`);
    }
    console.log("✓ Expired token returned status EXPIRED and DB record was conditionally updated to EXPIRED");

    // TEST 3: POST /mobilise/{token}/acknowledge (Atomic Transaction)
    console.log("\n--- TEST 3: POST /mobilise/{token}/acknowledge (Atomic Transaction) ---");
    const ackRes = await mobilisationsHandler(
      mockEvent({
        method: "POST",
        path: `/mobilise/${validToken}/acknowledge`,
        pathParameters: { token: validToken },
      }),
    );
    if (ackRes.statusCode !== 200) {
      throw new Error(`Expected 200, got ${ackRes.statusCode}: ${ackRes.body}`);
    }
    const ackBody = JSON.parse(ackRes.body);
    if (ackBody.status !== "ACKNOWLEDGED") {
      throw new Error(`Expected status ACKNOWLEDGED, got ${ackBody.status}`);
    }

    // Verify DB Token status
    const valKey = mobilisationKey(validToken);
    const dbMobItem = await getItem<MobilisationRecord>(valKey.PK, valKey.SK);
    if (dbMobItem?.status !== "ACKNOWLEDGED") {
      throw new Error(`Expected DB mobilisation status ACKNOWLEDGED, got ${dbMobItem?.status}`);
    }
    if (!dbMobItem.acknowledgedAt) {
      throw new Error("Expected acknowledgedAt timestamp to be set on mobilisation record");
    }

    // Verify Pool record updated
    const pKey = poolKey(poolId);
    const dbPoolItem = await getItem<DonorPool>(pKey.PK, pKey.SK);
    if (dbPoolItem?.lastMobilisationStatus !== "ACKNOWLEDGED") {
      throw new Error(`Expected pool lastMobilisationStatus ACKNOWLEDGED, got ${dbPoolItem?.lastMobilisationStatus}`);
    }
    if (!dbPoolItem?.lastMobilisedAt) {
      throw new Error("Expected pool lastMobilisedAt to be updated");
    }

    // Verify MOBILISATION_ACKNOWLEDGED audit record
    const reqPk = `REQ#${requisitionId}`;
    const auditLogs = await queryAll<AuditEvent>({
      keyCondition: "PK = :pk AND begins_with(SK, :skPrefix)",
      values: {
        ":pk": reqPk,
        ":skPrefix": "AUDIT#",
      },
    });
    const mobAckAudit = auditLogs.find((a) => a.eventType === "MOBILISATION_ACKNOWLEDGED");
    if (!mobAckAudit) {
      throw new Error("Audit event MOBILISATION_ACKNOWLEDGED was not written to requisition partition!");
    }
    recordsToDelete.push({ PK: reqPk, SK: mobAckAudit.SK });
    console.log("✓ POST /mobilise/{token}/acknowledge committed token, pool, and audit atomically");

    // TEST 4: Double Acknowledgement Rejection
    console.log("\n--- TEST 4: Double Acknowledgement Rejection ---");
    const doubleAckRes = await mobilisationsHandler(
      mockEvent({
        method: "POST",
        path: `/mobilise/${validToken}/acknowledge`,
        pathParameters: { token: validToken },
      }),
    );
    if (doubleAckRes.statusCode !== 409) {
      throw new Error(`Expected 409 Conflict for double-ack, got ${doubleAckRes.statusCode}`);
    }
    console.log("✓ Double acknowledgement rejected with 409 Conflict");

    // TEST 5: Acknowledge Expired Token Rejection
    console.log("\n--- TEST 5: Acknowledge Expired Token Rejection ---");
    const ackExpiredRes = await mobilisationsHandler(
      mockEvent({
        method: "POST",
        path: `/mobilise/${expiredToken}/acknowledge`,
        pathParameters: { token: expiredToken },
      }),
    );
    if (ackExpiredRes.statusCode !== 400) {
      throw new Error(`Expected 400 Bad Request for expired token ack, got ${ackExpiredRes.statusCode}`);
    }
    console.log("✓ Acknowledge expired token rejected with 400 Bad Request");

    // TEST 6: Invalid Token Handling
    console.log("\n--- TEST 6: Non-Existent Token Handling ---");
    const getRes404 = await mobilisationsHandler(
      mockEvent({
        method: "GET",
        path: "/mobilise/invalid-token-12345",
        pathParameters: { token: "invalid-token-12345" },
      }),
    );
    if (getRes404.statusCode !== 404) {
      throw new Error(`Expected 404 for unknown token, got ${getRes404.statusCode}`);
    }
    console.log("✓ Unknown token returns 404 Not Found");

    console.log("\n=== ALL BLOCK 3 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    console.log("\nCleaning up test records from DynamoDB...");
    for (const rec of recordsToDelete) {
      try {
        await deleteRecord(rec.PK, rec.SK);
      } catch (err) {
        console.warn(`Failed to clean up ${rec.PK} ${rec.SK}:`, err);
      }
    }
    console.log("Cleanup finished.");
  }
}

runVerification().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
