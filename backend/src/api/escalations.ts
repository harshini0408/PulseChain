import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import type { Escalation } from "@pulsechain/shared";
import { queryAll } from "../lib/db.js";
import { ok, withErrors } from "../lib/http.js";

export const handler = withErrors(
  async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const items = await queryAll<Escalation & Record<string, any>>({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk",
      values: {
        ":pk": "ESC#ACTIVE",
      },
    });

    const cleanEscalations: Escalation[] = items.map((item) => {
      const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
      return rest as Escalation;
    });

    return ok(cleanEscalations);
  }
);
