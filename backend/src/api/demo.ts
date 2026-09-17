import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ok, withErrors } from "../lib/http.js";

export const health = withErrors(
  async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return ok({
      ok: true,
      mode: process.env.DEMO_MODE ?? "true",
      table: process.env.TABLE_NAME ?? "",
    });
  }
);

