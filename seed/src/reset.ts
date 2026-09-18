/**
 * seed/src/reset.ts
 *
 * Wipes the entire DynamoDB table then re-seeds from scratch.
 *
 * Guarantees:
 *   - Idempotent: running twice produces identical state and item count.
 *   - Completes well under 60 seconds for a table of seed scale (~300–400 items).
 *   - Fails loudly (non-zero exit) if the post-reset item count doesn't match expectation.
 *   - Does NOT depend on the table being empty first.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { load } from "./load.js";
import { generateAll } from "./generate.js";
import { generateDistanceItems } from "./distances.js";

// ---------------------------------------------------------------------------
// DynamoDB client
// ---------------------------------------------------------------------------

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  console.error("ERROR: TABLE_NAME environment variable is not set.");
  process.exit(1);
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// ---------------------------------------------------------------------------
// Scan-and-delete
// ---------------------------------------------------------------------------

async function scanAllKeys(): Promise<Array<{ PK: string; SK: string }>> {
  const keys: Array<{ PK: string; SK: string }> = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME!,
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastKey,
      }),
    );
    if (res.Items) {
      keys.push(...(res.Items as Array<{ PK: string; SK: string }>));
    }
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return keys;
}

const BATCH_SIZE = 25;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 150;

async function batchDelete(keys: Array<{ PK: string; SK: string }>): Promise<void> {
  const chunks: Array<typeof keys> = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    chunks.push(keys.slice(i, i + BATCH_SIZE));
  }

  for (const chunk of chunks) {
    let unprocessed = chunk.map((k) => ({ DeleteRequest: { Key: { PK: k.PK, SK: k.SK } } }));
    let attempt = 0;

    while (unprocessed.length > 0) {
      const res = await docClient.send(
        new BatchWriteCommand({ RequestItems: { [TABLE_NAME!]: unprocessed } }),
      );
      const remaining = res.UnprocessedItems?.[TABLE_NAME!] ?? [];
      if (remaining.length === 0) break;

      attempt++;
      if (attempt > MAX_RETRIES) {
        throw new Error(`[reset] ${remaining.length} items remained undeleted after ${MAX_RETRIES} retries.`);
      }
      const backoffMs = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
      unprocessed = remaining as typeof unprocessed;
    }
  }
}

// ---------------------------------------------------------------------------
// Item-count verification
// ---------------------------------------------------------------------------

async function countItems(): Promise<number> {
  let count = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME!,
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      }),
    );
    count += res.Count ?? 0;
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return count;
}

// ---------------------------------------------------------------------------
// Main reset function
// ---------------------------------------------------------------------------

export async function reset(): Promise<{ expected: number; actual: number; elapsedSec: string }> {
  const startMs = Date.now();
  console.log(`\n[reset] Starting table reset on ${TABLE_NAME}...`);

  // 1. Scan all existing keys
  console.log("[reset] Scanning existing items...");
  const existingKeys = await scanAllKeys();
  console.log(`[reset] Found ${existingKeys.length} items to delete.`);

  // 2. Delete all
  if (existingKeys.length > 0) {
    await batchDelete(existingKeys);
    console.log("[reset] ✓ All items deleted.");
  } else {
    console.log("[reset] Table was already empty.");
  }

  // 3. Re-seed
  await load();

  // 4. Verify item count
  const expectedCount = (() => {
    const { total } = generateAll();
    const distCount = generateDistanceItems().length;
    return total + distCount;
  })();

  console.log("\n[reset] Verifying item count...");
  const actualCount = await countItems();

  const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log(`[reset] Expected: ${expectedCount}  Actual: ${actualCount}  (${elapsedSec}s elapsed)`);

  if (actualCount !== expectedCount) {
    console.error(`[reset] ✗ MISMATCH — expected ${expectedCount}, got ${actualCount}. Table may be partially seeded.`);
    throw new Error(`MISMATCH: expected ${expectedCount}, got ${actualCount}`);
  }

  console.log("[reset] ✓ Reset verified. Table is in a known, clean state.");

  if (parseFloat(elapsedSec) > 55) {
    console.warn(`[reset] ⚠ Reset took ${elapsedSec}s — approaching the 60s demo budget.`);
  }

  return { expected: expectedCount, actual: actualCount, elapsedSec };
}

if (process.argv[1] && (process.argv[1].endsWith("reset.ts") || process.argv[1].endsWith("reset.js"))) {
  reset().catch((err) => { console.error(err); process.exit(1); });
}
