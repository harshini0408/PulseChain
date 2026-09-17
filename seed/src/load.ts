import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { generateAllSeedItems } from "./generate.js";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_NAME = process.env.TABLE_NAME || "PulseChain";

async function chunkAndWrite(items: any[], tableName: string) {
  const CHUNK_SIZE = 25;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const putRequests = chunk.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      })
    );
    console.log(`[Seed] Wrote batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} items)`);
  }
}

export async function loadSeedData() {
  console.log(`[Seed] Loading seed data into DynamoDB table '${TABLE_NAME}'...`);
  const items = generateAllSeedItems();
  await chunkAndWrite(items, TABLE_NAME);
  console.log(`[Seed] Successfully loaded ${items.length} items.`);
}

if (process.argv[1]?.endsWith("load.ts") || process.argv[1]?.endsWith("load.js")) {
  loadSeedData().catch((err) => {
    console.error("[Seed Error]", err);
    process.exit(1);
  });
}
