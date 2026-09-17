import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { badRequest, ok, withErrors } from "../lib/http.js";
import { parseRequisitionWithBedrock } from "../lib/bedrock.js";

export const handler = withErrors(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    if (event.requestContext.http.method !== "POST") {
      return badRequest("Method not allowed. Use POST.");
    }

    if (!event.body) {
      return badRequest("Missing request body with 'text' field");
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return badRequest("Invalid JSON body");
    }

    const text = parsedBody.text;
    if (!text || typeof text !== "string") {
      return badRequest("'text' string field is required");
    }

    const result = await parseRequisitionWithBedrock(text);

    return ok({
      success: true,
      data: result,
      rawInput: text,
    });
  }
);
