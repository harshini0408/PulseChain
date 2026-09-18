/**
 * backend/src/lib/stats.ts
 *
 * Daily stats tracking using DynamoDB ADD updates.
 * Provides functions to record saved/lost units and query historical stats.
 */

import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { statsDayKey, isoNow, getConfig } from "@pulsechain/shared";
import { docClient, requireTableName, queryAll } from "./db.js";

export interface DailyStatsRecord {
  PK: "STATS";
  SK: string; // DAY#yyyy-mm-dd
  entityType: "STATS";
  date: string; // yyyy-mm-dd
  unitsSaved: number;
  unitsLost: number;
  valueSavedInr: number;
  valueLostInr: number;
}

function getTodayString(isoTimestamp?: string): string {
  const ts = isoTimestamp ?? isoNow();
  return ts.slice(0, 10); // yyyy-mm-dd
}

/**
 * Increment daily saved counters by atomic ADD.
 */
export async function recordUnitSaved(
  valueInr?: number,
  isoTimestamp?: string,
): Promise<void> {
  const day = getTodayString(isoTimestamp);
  const key = statsDayKey(day);
  const cfg = getConfig();
  const value = valueInr ?? cfg.valuePerUnitInr;

  await docClient.send(
    new UpdateCommand({
      TableName: requireTableName(),
      Key: key,
      UpdateExpression:
        "ADD unitsSaved :one, valueSavedInr :val SET entityType = :type, #date = :day",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":one": 1,
        ":val": value,
        ":type": "STATS",
        ":day": day,
      },
    }),
  );
}

/**
 * Increment daily lost counters by atomic ADD.
 */
export async function recordUnitLost(
  valueInr?: number,
  isoTimestamp?: string,
): Promise<void> {
  const day = getTodayString(isoTimestamp);
  const key = statsDayKey(day);
  const cfg = getConfig();
  const value = valueInr ?? cfg.valuePerUnitInr;

  await docClient.send(
    new UpdateCommand({
      TableName: requireTableName(),
      Key: key,
      UpdateExpression:
        "ADD unitsLost :one, valueLostInr :val SET entityType = :type, #date = :day",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":one": 1,
        ":val": value,
        ":type": "STATS",
        ":day": day,
      },
    }),
  );
}

/**
 * Query stats between two dates (inclusive) for the impact dashboard.
 */
export async function getStatsRange(
  fromDay: string,
  toDay: string,
): Promise<DailyStatsRecord[]> {
  const items = await queryAll<DailyStatsRecord>({
    keyCondition: "PK = :pk AND SK BETWEEN :fromSk AND :toSk",
    values: {
      ":pk": "STATS",
      ":fromSk": `DAY#${fromDay}`,
      ":toSk": `DAY#${toDay}`,
    },
    scanForward: true,
  });

  return items;
}
