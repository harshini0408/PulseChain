/**
 * backend/src/api/demo.ts
 *
 * Demo endpoints:
 * - GET  /health: health check
 * - POST /demo/sweep-now: triggers sweep worker synchronously, returns what it did
 * - POST /demo/reset: triggers the seed reset
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { notFound, ok, withErrors } from "../lib/http.js";
import { runSweep } from "../workers/sweep.js";
import { reset } from "@pulsechain/seed/src/reset.js";

export const health = withErrors(
  async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return ok({
      ok: true,
      mode: process.env.DEMO_MODE ?? "true",
      table: process.env.TABLE_NAME ?? "",
    });
  },
);

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.requestContext.http.path;

    // 1. GET /health
    if (method === "GET" && path === "/health") {
      return ok({
        ok: true,
        mode: process.env.DEMO_MODE ?? "true",
        table: process.env.TABLE_NAME ?? "",
      });
    }

    // 2. POST /demo/sweep-now
    if (method === "POST" && path.endsWith("/demo/sweep-now")) {
      const result = await runSweep();
      return ok({
        ok: true,
        action: "SWEEP_COMPLETED",
        sweptCount: result.sweptCount,
        timestamp: result.timestamp,
        units: result.units,
      });
    }

    // 3. POST /demo/reset
    if (method === "POST" && path.endsWith("/demo/reset")) {
      const resetResult = await reset();
      return ok({
        ok: true,
        action: "TABLE_RESET_COMPLETED",
        expectedCount: resetResult.expected,
        actualCount: resetResult.actual,
        elapsedSec: resetResult.elapsedSec,
      });
    }

    return notFound("Route not found");
  },
);
