import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { facilityKey } from "@pulsechain/shared";
import type { Facility } from "@pulsechain/shared";
import { getItem, queryAll } from "../lib/db.js";
import { notFound, ok, withErrors } from "../lib/http.js";

function toFacility(item: Record<string, any>): Facility {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...rest } = item;
  return rest as Facility;
}

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const id = event.pathParameters?.id;

    if (id) {
      const keys = facilityKey(id);
      const item = await getItem(keys.PK, keys.SK);
      if (!item) {
        return notFound(`Facility not found: ${id}`);
      }
      return ok(toFacility(item));
    }

    const items = await queryAll({
      indexName: "GSI1",
      keyCondition: "GSI1PK = :pk",
      values: {
        ":pk": "FACILITIES",
      },
    });

    return ok(items.map(toFacility));
  }
);

