/**
 * backend/src/workers/finish-escalation.ts
 *
 * Terminal worker for Step Functions escalation workflow:
 * - Marks escalation EXHAUSTED (or RESOLVED)
 * - Writes ESCALATION_EXHAUSTED audit event
 * - Unit remains RESCUE_PENDING
 */

import { isoNow, type Escalation, type BloodUnit } from "@pulsechain/shared";
import { getItem, transact } from "../lib/db.js";
import { writeAuditEvent } from "../lib/audit.js";

export interface FinishEscalationParams {
  unitId: string;
  escalationId: string;
  status: "EXHAUSTED" | "RESOLVED";
  cause?: string;
  now?: string;
}

export async function finishEscalation(params: FinishEscalationParams): Promise<{
  unitId: string;
  escalationId: string;
  status: string;
}> {
  const ts = params.now ?? isoNow();

  const escKey = { PK: `UNIT#${params.unitId}`, SK: `ESC#${params.escalationId}` };
  const esc = await getItem<Escalation>(escKey.PK, escKey.SK);

  if (esc && esc.status === "RUNNING") {
    await transact([
      {
        Update: {
          Key: escKey,
          UpdateExpression: "SET #status = :newStatus, endedAt = :ts",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":newStatus": params.status,
            ":ts": ts,
          },
        },
      },
    ]);
  }

  if (params.status === "EXHAUSTED") {
    await writeAuditEvent({
      eventType: "ESCALATION_EXHAUSTED",
      subjectType: "UNIT",
      subjectId: params.unitId,
      timestamp: ts,
      details: {
        escalationId: params.escalationId,
        cause: params.cause ?? "All 3 rings evaluated without claim",
      },
    });
  }

  return {
    unitId: params.unitId,
    escalationId: params.escalationId,
    status: params.status,
  };
}

// Lambda handler wrapper
export async function handler(event: FinishEscalationParams) {
  return await finishEscalation(event);
}
