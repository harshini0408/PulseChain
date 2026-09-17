import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "PulseChain";

export async function resetTable() {
  console.log(`[Reset] Scanning table '${TABLE_NAME}' for items to delete...`);

  let lastEvaluatedKey: any;
  let totalDeleted = 0;

  do {
    const scanRes = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = scanRes.Items || [];
    if (items.length > 0) {
      const CHUNK_SIZE = 25;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const deleteRequests = chunk.map((item) => ({
          DeleteRequest: {
            Key: { PK: item.PK, SK: item.SK },
          },
        }));

        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: deleteRequests,
            },
          })
        );
        totalDeleted += chunk.length;
      }
    }

    lastEvaluatedKey = scanRes.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`[Reset] Finished resetting table. Deleted ${totalDeleted} items.`);
}

if (process.argv[1]?.endsWith("reset.ts") || process.argv[1]?.endsWith("reset.js")) {
  resetTable().catch((err) => {
    console.error("[Reset Error]", err);
    process.exit(1);
  });
}
