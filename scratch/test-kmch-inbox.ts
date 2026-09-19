import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function main() {
  const res = await docClient.send(
    new QueryCommand({
      TableName: "PulseChain",
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "FACILITY#FAC_CBE_KMCH#INBOX",
      },
    }),
  );

  console.log(`KMCH inbox has ${res.Items?.length ?? 0} offers.`);
  const openOffers = res.Items?.filter((o: any) => o.status === "OPEN" && o.claimBy > new Date().toISOString());
  console.log(`KMCH inbox has ${openOffers?.length ?? 0} ACTIVE unexpired offers!`);
  for (const o of (openOffers ?? []).slice(0, 5)) {
    console.log(`- ${o.offerId}: ${o.bloodGroup} ${o.component}, claimBy=${o.claimBy}, status=${o.status}`);
  }
}

main().catch(console.error);
