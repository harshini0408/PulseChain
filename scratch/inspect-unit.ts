import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "PulseChain";

async function main() {
  const unitRes = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "UNIT#U55C57389F4F6406C",
        SK: "META",
      },
    }),
  );

  console.log("Unit META:", JSON.stringify(unitRes.Item, null, 2));
}

main().catch(console.error);
