import {
  escalationKey,
  isoNow,
  unitKey,
  type BloodUnit,
  type Escalation,
} from "@pulsechain/shared";
import { docClient, getItem, requireTableName } from "../lib/db.js";
import { transitionUnit } from "../lib/transitions.js";
import { writeAuditEvent } from "../lib/audit.js";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export interface FinishEscalationInput {
  unitId: string;
  escalationId: string;
  resolved: boolean;
}

export interface FinishEscalationOutput {
  unitId: string;
  escalationId: string;
  status: "RESOLVED" | "EXHAUSTED";
  endedAt: string;
}

export async function handler(event: FinishEscalationInput): Promise<FinishEscalationOutput> {
  const { unitId, escalationId, resolved } = event;
  const status = resolved ? "RESOLVED" : "EXHAUSTED";
  const now = isoNow();

  const escKeys = escalationKey("UNIT", unitId, escalationId);

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: requireTableName(),
        Key: escKeys,
        UpdateExpression: "SET #status = :status, #endedAt = :endedAt REMOVE GSI1PK, GSI1SK",
        ExpressionAttributeNames: {
          "#status": "status",
          "#endedAt": "endedAt",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":endedAt": now,
        },
      })
    );
  } catch (err) {
    console.warn(`Could not update escalation ${escalationId}:`, err);
  }

  // If exhausted and unit is still in RESCUE_PENDING, check if past expiry
  if (!resolved) {
    const unitKeys = unitKey(unitId);
    const unit = await getItem<BloodUnit>(unitKeys.PK, unitKeys.SK);

    if (unit && unit.status === "RESCUE_PENDING" && unit.expiresAt <= now) {
      try {
        await transitionUnit(unitId, "RESCUE_PENDING", "LOST", {
          note: `Unit expired following exhausted escalation ${escalationId}`,
        });
      } catch (err) {
        console.warn(`Could not mark unit ${unitId} as LOST:`, err);
      }
    }
  }

  return {
    unitId,
    escalationId,
    status,
    endedAt: now,
  };
}
