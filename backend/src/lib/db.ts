import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.TABLE_NAME ?? (() => {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return "PulseChainTest";
  throw new Error("TABLE_NAME environment variable is missing");
})();

export function requireTableName(): string {
  const table = process.env.TABLE_NAME || TABLE_NAME;
  if (!table) {
    throw new Error("TABLE_NAME environment variable is missing");
  }
  return table;
}

export async function getItem<T = Record<string, any>>(
  PK: string,
  SK: string
): Promise<T | null> {
  const res = await docClient.send(
    new GetCommand({
      TableName: requireTableName(),
      Key: { PK, SK },
    })
  );
  return (res.Item as T) ?? null;
}

export interface QueryAllOptions {
  indexName?: string;
  keyCondition: string;
  values: Record<string, any>;
  names?: Record<string, string>;
  scanForward?: boolean;
  filterExpression?: string;
}

export async function queryAll<T = Record<string, any>>(
  options: QueryAllOptions
): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, any> | undefined;

  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: requireTableName(),
        IndexName: options.indexName,
        KeyConditionExpression: options.keyCondition,
        ExpressionAttributeValues: options.values,
        ExpressionAttributeNames: options.names,
        ScanIndexForward: options.scanForward,
        FilterExpression: options.filterExpression,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    if (res.Items) {
      items.push(...(res.Items as T[]));
    }

    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

export async function putItem<T extends Record<string, any>>(
  item: T,
  condition?: string,
  conditionValues?: Record<string, any>,
  conditionNames?: Record<string, string>
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: requireTableName(),
      Item: item,
      ConditionExpression: condition,
      ExpressionAttributeValues: conditionValues,
      ExpressionAttributeNames: conditionNames,
    })
  );
}

export type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

export async function transact(items: TransactItem[]): Promise<void> {
  if (!items || items.length === 0) return;
  const tableName = requireTableName();
  const normalizedItems = items.map((item) => {
    if (item.Put && !item.Put.TableName) item.Put.TableName = tableName;
    if (item.Update && !item.Update.TableName) item.Update.TableName = tableName;
    if (item.Delete && !item.Delete.TableName) item.Delete.TableName = tableName;
    if (item.ConditionCheck && !item.ConditionCheck.TableName) item.ConditionCheck.TableName = tableName;
    return item;
  });

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: normalizedItems,
    })
  );
}

