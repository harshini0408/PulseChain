import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  parsedRequisitionSchema,
  type ParsedRequisition,
} from "@pulsechain/shared";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const SYSTEM_PROMPT = `
You are PulseChain's medical requisition extraction AI.
Extract blood requisition details from free text messages (which may be in English, Tamil, Hindi, or code-mixed).
Extract and return ONLY a valid JSON object (no markdown, no backticks, no other text) with the following structure:
{
  "hospitalName": string (optional),
  "component": "PLATELETS" | "RBC" | "PLASMA",
  "bloodGroup": "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+",
  "units": integer (positive),
  "urgency": "NORMAL" | "HIGH" | "CRITICAL",
  "neededBy": ISO 8601 UTC date string (default to 6 hours from now if unspecified or "tomorrow/morning/urgent"),
  "confidence": number between 0.0 and 1.0
}
`.trim();

function heuristicFallback(text: string): ParsedRequisition {
  const upper = text.toUpperCase();

  let component: "PLATELETS" | "RBC" | "PLASMA" = "PLATELETS";
  if (upper.includes("RBC") || upper.includes("RED") || upper.includes("BLOOD")) {
    component = "RBC";
  }
  if (upper.includes("PLASMA") || upper.includes("FFP")) {
    component = "PLASMA";
  }
  if (upper.includes("PLATELET") || upper.includes("PLT") || upper.includes("RDP") || upper.includes("SDP")) {
    component = "PLATELETS";
  }

  let bloodGroup: "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+" = "O-";
  if (upper.includes("AB+") || upper.includes("AB POS")) bloodGroup = "AB+";
  else if (upper.includes("AB-") || upper.includes("AB NEG")) bloodGroup = "AB-";
  else if (upper.includes("A+") || upper.includes("A POS")) bloodGroup = "A+";
  else if (upper.includes("A-") || upper.includes("A NEG")) bloodGroup = "A-";
  else if (upper.includes("B+") || upper.includes("B POS")) bloodGroup = "B+";
  else if (upper.includes("B-") || upper.includes("B NEG")) bloodGroup = "B-";
  else if (upper.includes("O+") || upper.includes("O POS")) bloodGroup = "O+";
  else if (upper.includes("O-") || upper.includes("O NEG")) bloodGroup = "O-";

  let urgency: "NORMAL" | "HIGH" | "CRITICAL" = "NORMAL";
  if (upper.includes("CRITICAL") || upper.includes("EMERGENCY") || upper.includes("IMMEDIATE") || upper.includes("SOS")) {
    urgency = "CRITICAL";
  } else if (upper.includes("URGENT") || upper.includes("ASAP") || upper.includes("TODAY") || upper.includes("AVASARAM")) {
    urgency = "HIGH";
  }

  const unitsMatch = text.match(/(\d+)\s*(unit|units|bag|bags|pack|packs|nos)?/i);
  const units = unitsMatch ? parseInt(unitsMatch[1], 10) : 2;

  const neededBy = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

  return {
    hospitalName: undefined,
    component,
    bloodGroup,
    units: isNaN(units) || units <= 0 ? 1 : units,
    urgency,
    neededBy,
    confidence: 0.7,
  };
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function parseRequisitionWithBedrock(text: string): Promise<ParsedRequisition> {
  const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  try {
    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [
          {
            role: "user",
            content: [{ text: `Requisition request text:\n"${text}"` }],
          },
        ],
        inferenceConfig: {
          maxTokens: 500,
          temperature: 0.1,
        },
      })
    );

    const messageContent = response.output?.message?.content?.[0]?.text;
    if (!messageContent) {
      return heuristicFallback(text);
    }

    const cleaned = cleanJsonText(messageContent);
    const parsedJson = JSON.parse(cleaned);
    const validated = parsedRequisitionSchema.parse(parsedJson);
    return validated;
  } catch (err) {
    console.warn("[Bedrock] Fallback triggered due to error:", err);
    return heuristicFallback(text);
  }
}
