/**
 * seed/src/load.ts
 *
 * Batch-writes all generated items + distance items to the live DynamoDB table.
 * - 25 items per BatchWrite request (DynamoDB maximum)
 * - Retries UnprocessedItems with exponential backoff
 * - Reads TABLE_NAME from env, never hardcoded
 * - Prints entity-count summary at the end
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

import { generateAll } from "./generate.js";
import { generateDistanceItems } from "./distances.js";
import { isoNow } from "@pulsechain/shared";

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
// Batch write with retry
// ---------------------------------------------------------------------------

const BATCH_SIZE = 25;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 200;

async function batchWrite(items: Record<string, unknown>[]): Promise<void> {
  // Split into chunks of 25
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    chunks.push(items.slice(i, i + BATCH_SIZE));
  }

  for (const chunk of chunks) {
    let unprocessed = chunk.map((item) => ({ PutRequest: { Item: item } }));
    let attempt = 0;

    while (unprocessed.length > 0) {
      const res = await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [TABLE_NAME!]: unprocessed },
        }),
      );

      const remaining = res.UnprocessedItems?.[TABLE_NAME!] ?? [];
      if (remaining.length === 0) break;

      attempt++;
      if (attempt > MAX_RETRIES) {
        throw new Error(
          `[load] ${remaining.length} items remained unprocessed after ${MAX_RETRIES} retries.`,
        );
      }

      const backoffMs = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      console.warn(`  [load] ${remaining.length} unprocessed items, retrying in ${backoffMs}ms (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, backoffMs));
      unprocessed = remaining as typeof unprocessed;
    }
  }
}

// ---------------------------------------------------------------------------
// Main load function (exported so reset.ts can call it)
// ---------------------------------------------------------------------------

export async function load(now?: string): Promise<void> {
  const ts = now ?? isoNow();
  console.log(`\n[load] Generating items at ${ts}...`);

  const { items: baseItems, counts, total: baseTotal } = generateAll(ts);
  const distItems = generateDistanceItems();

  console.log(`[load] Writing ${baseTotal} base items + ${distItems.length} distance items to ${TABLE_NAME}...`);

  // Strip the _tag helper field before writing to DynamoDB
  const basePayload = baseItems.map(({ _tag, ...rest }) => rest as Record<string, unknown>);
  const distPayload = distItems.map(({ _tag, ...rest }) => rest as Record<string, unknown>);

  await batchWrite(basePayload);
  await batchWrite(distPayload);

  console.log("\n[load] ✓ Load complete. Entity counts:");
  for (const [tag, n] of Object.entries(counts)) {
    console.log(`  ${tag.padEnd(14)} ${n}`);
  }
  console.log(`  ${"DISTANCE".padEnd(14)} ${distItems.length}`);
  console.log(`  ${"TOTAL".padEnd(14)} ${baseTotal + distItems.length}`);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] && (process.argv[1].endsWith("load.ts") || process.argv[1].endsWith("load.js"))) {
  load().catch((err) => { console.error(err); process.exit(1); });
}

