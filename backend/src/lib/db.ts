import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
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

export async function updateItem(params: {
  Key: { PK: string; SK: string };
  UpdateExpression: string;
  ExpressionAttributeValues?: Record<string, any>;
  ExpressionAttributeNames?: Record<string, string>;
  ConditionExpression?: string;
}): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: requireTableName(),
      Key: params.Key,
      UpdateExpression: params.UpdateExpression,
      ExpressionAttributeValues: params.ExpressionAttributeValues,
      ExpressionAttributeNames: params.ExpressionAttributeNames,
      ConditionExpression: params.ConditionExpression,
    })
  );
}

export type TransactItem = {
  Put?: Omit<NonNullable<NonNullable<TransactWriteCommandInput["TransactItems"]>[number]["Put"]>, "TableName"> & { TableName?: string };
  Update?: Omit<NonNullable<NonNullable<TransactWriteCommandInput["TransactItems"]>[number]["Update"]>, "TableName"> & { TableName?: string };
  Delete?: Omit<NonNullable<NonNullable<TransactWriteCommandInput["TransactItems"]>[number]["Delete"]>, "TableName"> & { TableName?: string };
  ConditionCheck?: Omit<NonNullable<NonNullable<TransactWriteCommandInput["TransactItems"]>[number]["ConditionCheck"]>, "TableName"> & { TableName?: string };
};

export async function transact(items: TransactItem[]): Promise<void> {
  if (!items || items.length === 0) return;
  const tableName = requireTableName();
  const normalizedItems = items.map((item) => {
    const copy: any = { ...item };
    if (copy.Put && !copy.Put.TableName) copy.Put = { ...copy.Put, TableName: tableName };
    if (copy.Update && !copy.Update.TableName) copy.Update = { ...copy.Update, TableName: tableName };
    if (copy.Delete && !copy.Delete.TableName) copy.Delete = { ...copy.Delete, TableName: tableName };
    if (copy.ConditionCheck && !copy.ConditionCheck.TableName) copy.ConditionCheck = { ...copy.ConditionCheck, TableName: tableName };
    return copy;
  });

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: normalizedItems as any,
        })
      );
      return;
    } catch (err: any) {
      const isConflict =
        err.name === "TransactionCanceledException" &&
        err.CancellationReasons?.some((r: any) => r.Code === "TransactionConflict");
      if (isConflict && attempt < maxRetries) {
        const delayMs = Math.floor(Math.random() * 80) + attempt * 60;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}

