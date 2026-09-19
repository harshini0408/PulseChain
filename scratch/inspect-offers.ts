import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "PulseChain";

async function main() {
  // 1. Scan for units that are RESCUE_PENDING
  const unitsScan = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#status = :st AND begins_with(PK, :uPrefix) AND SK = :meta",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":st": "RESCUE_PENDING",
        ":uPrefix": "UNIT#",
        ":meta": "META",
      },
    }),
  );

  console.log(`Found ${unitsScan.Items?.length ?? 0} RESCUE_PENDING units.`);

  // 2. Scan for offers for these units
  const offersScan = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(SK, :offPrefix)",
      ExpressionAttributeValues: {
        ":offPrefix": "OFFER#",
      },
    }),
  );

  console.log(`Found ${offersScan.Items?.length ?? 0} total offer items.`);
  const sample = offersScan.Items?.slice(0, 3);
  console.log("Sample offers:", JSON.stringify(sample, null, 2));
}

main().catch(console.error);
