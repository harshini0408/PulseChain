/**
 * backend/src/api/dashboard.ts
 *
 * Impact Dashboard API:
 * - GET /dashboard: historical stats between two dates + today's live counters
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { isoNow, dayKey, statsDayKey } from "@pulsechain/shared";
import { ok, withErrors } from "../lib/http.js";
import { getStatsRange, type DailyStatsRecord } from "../lib/stats.js";
import { getItem } from "../lib/db.js";

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const now = isoNow();
    const today = dayKey(now);

    // Default range: last 30 days
    const fromParam =
      event.queryStringParameters?.from ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toParam = event.queryStringParameters?.to ?? today;

    const history = await getStatsRange(fromParam, toParam);

    // Get today's live counters
    const todayKey = statsDayKey(today);
    const todayRecord = await getItem<DailyStatsRecord>(todayKey.PK, todayKey.SK);

    // Aggregate totals across history
    const totals = history.reduce(
      (acc, day) => ({
        unitsSaved: acc.unitsSaved + (day.unitsSaved || 0),
        unitsLost: acc.unitsLost + (day.unitsLost || 0),
        valueSavedInr: acc.valueSavedInr + (day.valueSavedInr || 0),
        valueLostInr: acc.valueLostInr + (day.valueLostInr || 0),
      }),
      { unitsSaved: 0, unitsLost: 0, valueSavedInr: 0, valueLostInr: 0 },
    );

    return ok({
      from: fromParam,
      to: toParam,
      today: todayRecord ?? {
        date: today,
        unitsSaved: 0,
        unitsLost: 0,
        valueSavedInr: 0,
        valueLostInr: 0,
      },
      totals,
      history,
    });
  },
);
