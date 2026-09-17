import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { statsDayKey, todayKey, type DailyStats } from "@pulsechain/shared";
import { docClient, getItem, requireTableName, type TransactItem } from "./db.js";

export interface IncrementStatsParams {
  unitsSaved?: number;
  unitsLost?: number;
  valueSavedInr?: number;
  valueLostInr?: number;
}

export async function incrementDailyStats(
  day: string = todayKey(),
  params: IncrementStatsParams
): Promise<void> {
  const keys = statsDayKey(day);
  const uSaved = params.unitsSaved ?? 0;
  const uLost = params.unitsLost ?? 0;
  const vSaved = params.valueSavedInr ?? 0;
  const vLost = params.valueLostInr ?? 0;

  if (uSaved === 0 && uLost === 0 && vSaved === 0 && vLost === 0) {
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: requireTableName(),
      Key: keys,
      UpdateExpression:
        "ADD #unitsSaved :uSaved, #unitsLost :uLost, #valueSavedInr :vSaved, #valueLostInr :vLost SET #entityType = if_not_exists(#entityType, :entityType)",
      ExpressionAttributeNames: {
        "#unitsSaved": "unitsSaved",
        "#unitsLost": "unitsLost",
        "#valueSavedInr": "valueSavedInr",
        "#valueLostInr": "valueLostInr",
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":uSaved": uSaved,
        ":uLost": uLost,
        ":vSaved": vSaved,
        ":vLost": vLost,
        ":entityType": "DailyStats",
      },
    })
  );
}

export function buildStatsTransactItem(
  day: string = todayKey(),
  params: IncrementStatsParams
): TransactItem {
  const keys = statsDayKey(day);
  return {
    Update: {
      Key: keys,
      UpdateExpression:
        "ADD #unitsSaved :uSaved, #unitsLost :uLost, #valueSavedInr :vSaved, #valueLostInr :vLost SET #entityType = if_not_exists(#entityType, :entityType)",
      ExpressionAttributeNames: {
        "#unitsSaved": "unitsSaved",
        "#unitsLost": "unitsLost",
        "#valueSavedInr": "valueSavedInr",
        "#valueLostInr": "valueLostInr",
        "#entityType": "entityType",
      },
      ExpressionAttributeValues: {
        ":uSaved": params.unitsSaved ?? 0,
        ":uLost": params.unitsLost ?? 0,
        ":vSaved": params.valueSavedInr ?? 0,
        ":vLost": params.valueLostInr ?? 0,
        ":entityType": "DailyStats",
      },
    },
  };
}

export async function getDailyStats(day: string = todayKey()): Promise<DailyStats> {
  const keys = statsDayKey(day);
  const item = await getItem<DailyStats>(keys.PK, keys.SK);
  return {
    unitsSaved: item?.unitsSaved ?? 0,
    unitsLost: item?.unitsLost ?? 0,
    valueSavedInr: item?.valueSavedInr ?? 0,
    valueLostInr: item?.valueLostInr ?? 0,
  };
}
