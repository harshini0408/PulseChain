import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const JSON_HEADERS = {
  "content-type": "application/json",
};

export function ok(body: unknown, status = 200): HttpResponse {
  return {
    statusCode: status,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export function badRequest(msg: string): HttpResponse {
  return {
    statusCode: 400,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: msg }),
  };
}

export function notFound(msg: string): HttpResponse {
  return {
    statusCode: 404,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: msg }),
  };
}

export function forbidden(msg: string): HttpResponse {
  return {
    statusCode: 403,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: msg }),
  };
}

export function conflict(msg: string): HttpResponse {
  return {
    statusCode: 409,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: msg }),
  };
}

export function serverError(err: unknown): HttpResponse {
  const message = err instanceof Error ? err.message : String(err);
  return {
    statusCode: 500,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: message }),
  };
}

export type ApiHandler = (
  event: APIGatewayProxyEventV2
) => Promise<APIGatewayProxyResultV2>;

export function withErrors(handler: ApiHandler): ApiHandler {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    try {
      return await handler(event);
    } catch (err) {
      console.error("API error:", err);
      return serverError(err);
    }
  };
}

