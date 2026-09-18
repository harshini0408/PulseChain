import http from "node:http";
import { URL } from "node:url";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { handler as unitsHandler } from "./api/units.js";
import { handler as requisitionsHandler } from "./api/requisitions.js";
import { handler as parseHandler } from "./api/parse.js";
import { handler as offersHandler } from "./api/offers.js";
import { handler as transfersHandler } from "./api/transfers.js";
import { handler as escalationsHandler } from "./api/escalations.js";
import { handler as dashboardHandler } from "./api/dashboard.js";
import { handler as donorsHandler } from "./api/donors.js";
import { handler as communitiesHandler } from "./api/communities.js";
import { queryAll } from "./lib/db.js";

// Set default envs if not provided
process.env.AWS_REGION = process.env.AWS_REGION || "ap-south-1";
process.env.TABLE_NAME = process.env.TABLE_NAME || "PulseChain";

const PORT = parseInt(process.env.PORT || "3001", 10);

function parsePathParameters(path: string): Record<string, string> {
  const params: Record<string, string> = {};
  const segments = path.split("/").filter(Boolean);

  // /facilities/{id}/stock
  if (segments[0] === "facilities" && segments[2] === "stock" && segments[1]) {
    params.facilityId = segments[1];
    params.id = segments[1];
  } else if (segments[0] === "facilities" && segments[1]) {
    params.facilityId = segments[1];
    params.id = segments[1];
  }

  // /units/{id}/in-transit or /units/{id}/received or /units/{id}
  if (segments[0] === "units" && segments[1]) {
    params.unitId = segments[1];
    params.id = segments[1];
  }

  // /offers/{id}/claim or /offers/{id}/decline
  if (segments[0] === "offers" && segments[1]) {
    params.offerId = decodeURIComponent(segments[1]);
    params.id = decodeURIComponent(segments[1]);
  }

  // /donors/{id} or /donors/{id}/defer
  if (segments[0] === "donors" && segments[1]) {
    params.donorId = segments[1];
    params.id = segments[1];
  }

  // /communities/{id}/alerts/{alertId}/respond or /communities/{id}
  if (segments[0] === "communities" && segments[1]) {
    params.communityId = segments[1];
    params.id = segments[1];
    if (segments[2] === "alerts" && segments[3]) {
      params.alertId = segments[3];
    }
  }

  return params;
}

const server = http.createServer(async (req, res) => {
  // Permissive CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-facility-id, x-community-id, x-role");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;
  const method = req.method || "GET";

  // Collect request body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");

  // Query params
  const queryStringParameters: Record<string, string> = {};
  reqUrl.searchParams.forEach((val, key) => {
    queryStringParameters[key] = val;
  });

  const pathParameters = parsePathParameters(pathname);

  // Construct APIGatewayProxyEventV2
  const event: APIGatewayProxyEventV2 = {
    version: "2.0",
    routeKey: `${method} ${pathname}`,
    rawPath: pathname,
    rawQueryString: reqUrl.search.replace(/^\?/, ""),
    headers: req.headers as Record<string, string>,
    queryStringParameters,
    pathParameters,
    body: body.length > 0 ? body : undefined,
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "local",
      domainName: "localhost",
      domainPrefix: "localhost",
      http: {
        method,
        path: pathname,
        protocol: "HTTP/1.1",
        sourceIp: req.socket.remoteAddress || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "",
      },
      requestId: `req-${Date.now()}`,
      routeKey: `${method} ${pathname}`,
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
  };

  try {
    let result: APIGatewayProxyResultV2 | undefined;

    // Direct facilities endpoint handler
    if (pathname === "/facilities" && method === "GET") {
      try {
        const facilities = await queryAll({
          indexName: "GSI1",
          keyCondition: "GSI1PK = :pk",
          values: { ":pk": "FACILITIES" },
        });
        if (facilities && facilities.length > 0) {
          result = {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(facilities),
          };
        } else {
          throw new Error("No facilities returned from DB, using fallback");
        }
      } catch {
        const fallbackFacilities = [
          { facilityId: "CBE-BC-01", name: "Coimbatore Central Blood Centre", type: "BLOOD_CENTRE", city: "Coimbatore", lat: 11.0168, lng: 76.9558, components: ["PLATELETS", "RBC", "PLASMA"] },
          { facilityId: "CBE-HOSP-04", name: "Coimbatore East Hospital", type: "HOSPITAL", city: "Coimbatore", lat: 11.051, lng: 77.024, components: ["PLATELETS", "RBC", "PLASMA"] },
          { facilityId: "TUP-HOSP-01", name: "Tiruppur General Hospital", type: "HOSPITAL", city: "Tiruppur", lat: 11.1085, lng: 77.3411, components: ["PLATELETS", "RBC"] },
          { facilityId: "ERD-HOSP-02", name: "Erode Medical Trust", type: "HOSPITAL", city: "Erode", lat: 11.341, lng: 77.7172, components: ["PLATELETS", "RBC"] },
          { facilityId: "SLM-HOSP-03", name: "Salem Government Multi-Care", type: "HOSPITAL", city: "Salem", lat: 11.6643, lng: 78.146, components: ["PLATELETS", "RBC", "PLASMA"] },
        ];
        result = {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackFacilities),
        };
      }
    } else if (pathname === "/requisitions/parse" && method === "POST") {
      result = await parseHandler(event);
    } else if (pathname.startsWith("/requisitions")) {
      result = await requisitionsHandler(event);
    } else if (pathname.startsWith("/inbox") || pathname.startsWith("/offers")) {
      result = await offersHandler(event);
    } else if (pathname.startsWith("/units") && (pathname.includes("/in-transit") || pathname.includes("/received"))) {
      result = await transfersHandler(event);
    } else if (pathname.startsWith("/units") || pathname.startsWith("/facilities")) {
      result = await unitsHandler(event);
    } else if (pathname.startsWith("/escalations")) {
      result = await escalationsHandler(event);
    } else if (pathname.startsWith("/dashboard")) {
      result = await dashboardHandler(event);
    } else if (pathname.startsWith("/donors")) {
      result = await donorsHandler(event);
    } else if (pathname.startsWith("/communities")) {
      result = await communitiesHandler(event);
    } else {
      result = {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Route not found: ${method} ${pathname}` }),
      };
    }

    if (!result) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No response from handler" }));
      return;
    }

    if (typeof result === "string") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(result);
      return;
    }

    const statusCode = result.statusCode || 200;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        headers[k] = String(v);
      }
    }
    res.writeHead(statusCode, headers);
    res.end(result.body || "");
  } catch (err: any) {
    console.error("Local server error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  console.log(`
==================================================
  🩸 PulseChain Local Backend Server Running
  🚀 http://localhost:${PORT}
  📦 Connected DynamoDB Table: ${process.env.TABLE_NAME}
  🌐 AWS Region: ${process.env.AWS_REGION}
==================================================
`);
});
