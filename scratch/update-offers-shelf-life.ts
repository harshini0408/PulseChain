import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "PulseChain";

async function main() {
  // 1. Scan for all offers
  const offersScan = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(SK, :offPrefix)",
      ExpressionAttributeValues: {
        ":offPrefix": "OFFER#",
      },
    }),
  );

  const offers = offersScan.Items ?? [];
  console.log(`Found ${offers.length} total offers.`);

  let updatedCount = 0;

  for (const offer of offers) {
    // Get unit to find expiresAt and status
    const unitRes = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `UNIT#${offer.unitId}`,
          SK: "META",
        },
      }),
    );

    const unit = unitRes.Item;
    if (!unit) continue;

    // If unit is RESCUE_PENDING and has shelf life left, make the offer active until expiresAt
    if (unit.status === "RESCUE_PENDING" && unit.expiresAt > new Date().toISOString()) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: offer.PK,
            SK: offer.SK,
          },
          UpdateExpression: "SET #status = :openStatus, claimBy = :exp, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":openStatus": "OPEN",
            ":exp": unit.expiresAt,
            ":gsi2pk": `FACILITY#${offer.recipientFacilityId}#INBOX`,
            ":gsi2sk": offer.createdAt ?? new Date().toISOString(),
          },
        }),
      );
      updatedCount++;
      console.log(`Updated offer ${offer.offerId} -> OPEN until ${unit.expiresAt} for facility ${offer.recipientFacilityId}`);
    }
  }

  console.log(`Successfully updated ${updatedCount} offers to remain OPEN until unit shelf-life ends!`);
}

main().catch(console.error);
