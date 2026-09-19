/**
 * backend/src/api/dashboard.ts
 *
 * Impact Dashboard API:
 * - GET /dashboard: historical stats between two dates + today's live counters
 *
 * Block 5: extended with requisition fulfilment rate and mobilisation
 * response rate counters — all pulled from the same STATS daily rollup
 * using the ADD-based counters added to stats.ts.
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

    // Aggregate totals across history — all counters, including Block 5 additions
    const totals = history.reduce(
      (acc, day) => ({
        unitsSaved: acc.unitsSaved + (day.unitsSaved || 0),
        unitsLost: acc.unitsLost + (day.unitsLost || 0),
        valueSavedInr: acc.valueSavedInr + (day.valueSavedInr || 0),
        valueLostInr: acc.valueLostInr + (day.valueLostInr || 0),
        requisitionsFilled: acc.requisitionsFilled + (day.requisitionsFilled || 0),
        requisitionsPartial: acc.requisitionsPartial + (day.requisitionsPartial || 0),
        requisitionsOpen: acc.requisitionsOpen + (day.requisitionsOpen || 0),
        mobilisationsSent: acc.mobilisationsSent + (day.mobilisationsSent || 0),
        mobilisationsAcknowledged: acc.mobilisationsAcknowledged + (day.mobilisationsAcknowledged || 0),
      }),
      {
        unitsSaved: 0,
        unitsLost: 0,
        valueSavedInr: 0,
        valueLostInr: 0,
        requisitionsFilled: 0,
        requisitionsPartial: 0,
        requisitionsOpen: 0,
        mobilisationsSent: 0,
        mobilisationsAcknowledged: 0,
      },
    );

    // Derived rates (0–100, rounded to 1 dp; null when denominator is zero)
    const totalReqs =
      totals.requisitionsFilled + totals.requisitionsPartial + totals.requisitionsOpen;
    const fulfilmentRatePct =
      totalReqs > 0
        ? Math.round((totals.requisitionsFilled / totalReqs) * 1000) / 10
        : null;

    const mobilisationResponseRatePct =
      totals.mobilisationsSent > 0
        ? Math.round(
            (totals.mobilisationsAcknowledged / totals.mobilisationsSent) * 1000,
          ) / 10
        : null;

    return ok({
      from: fromParam,
      to: toParam,
      today: todayRecord ?? {
        date: today,
        unitsSaved: 0,
        unitsLost: 0,
        valueSavedInr: 0,
        valueLostInr: 0,
        requisitionsFilled: 0,
        requisitionsPartial: 0,
        requisitionsOpen: 0,
        mobilisationsSent: 0,
        mobilisationsAcknowledged: 0,
      },
      totals,
      rates: {
        fulfilmentRatePct,
        mobilisationResponseRatePct,
      },
      history,
    });
  },
);
