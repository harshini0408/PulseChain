import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { todayKey, type DailyStats } from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";
import { ok, withErrors } from "../lib/http.js";

export const handler = withErrors(
  async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // 1. Fetch past 30 days daily stats
    const today = new Date();
    const trend: Array<{ date: string } & DailyStats> = [];

    let totalSaved = 0;
    let totalLost = 0;
    let totalValueSaved = 0;
    let totalValueLost = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      const statItem = await getItem<DailyStats>("STATS", `DAY#${dateStr}`);
      const saved = statItem?.unitsSaved ?? 0;
      const lost = statItem?.unitsLost ?? 0;
      const valSaved = statItem?.valueSavedInr ?? saved * 1500;
      const valLost = statItem?.valueLostInr ?? lost * 1500;

      totalSaved += saved;
      totalLost += lost;
      totalValueSaved += valSaved;
      totalValueLost += valLost;

      trend.push({
        date: dateStr,
        unitsSaved: saved,
        unitsLost: lost,
        valueSavedInr: valSaved,
        valueLostInr: valLost,
      });
    }

    // 2. Fetch active escalations count
    const activeEscs = await queryAll({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk",
      values: {
        ":pk": "ESC#ACTIVE",
      },
    });

    // 3. Compute rescue success rate
    const totalHandled = totalSaved + totalLost;
    const successRate = totalHandled > 0 ? (totalSaved / totalHandled) * 100 : 100.0;

    return ok({
      unitsSaved: totalSaved,
      unitsLost: totalLost,
      valueSavedInr: totalValueSaved,
      valueLostInr: totalValueLost,
      activeEscalations: activeEscs.length,
      successRate: Number(successRate.toFixed(1)),
      trend,
    });
  }
);
