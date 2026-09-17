import {
  isoNow,
  todayKey,
  unitKey,
  unitQueueGsi1,
  type AuditEventType,
  type BloodUnit,
  type UnitStatus,
} from "@pulsechain/shared";
import { getItem, transact, type TransactItem } from "./db.js";
import { buildAuditTransactItem } from "./audit.js";
import { buildStatsTransactItem } from "./stats.js";

export interface TransitionOptions {
  actorFacilityId?: string | null;
  note?: string;
  claimedBy?: string;
  activeEscalationId?: string;
  details?: Record<string, unknown>;
}

function mapEventType(from: UnitStatus, to: UnitStatus): AuditEventType {
  if (from === "AVAILABLE" && to === "RESCUE_PENDING") return "THRESHOLD_CROSSED";
  if (to === "CLAIMED") return "OFFER_CLAIMED";
  if (to === "IN_TRANSIT") return "TRANSFER_IN_TRANSIT";
  if (to === "RECEIVED") return "TRANSFER_RECEIVED";
  if (to === "LOST") return "UNIT_LOST";
  return "THRESHOLD_CROSSED";
}

export async function transitionUnit(
  unitId: string,
  from: UnitStatus,
  to: UnitStatus,
  options?: TransitionOptions
): Promise<BloodUnit> {
  const keys = unitKey(unitId);
  const current = await getItem<BloodUnit>(keys.PK, keys.SK);

  if (!current) {
    throw new Error(`Unit ${unitId} not found`);
  }

  if (current.status !== from) {
    throw new Error(
      `Conflict: Unit ${unitId} is in status '${current.status}', expected '${from}'`
    );
  }

  const now = isoNow();
  const eventType = mapEventType(from, to);

  // Determine GSI1 update
  let setGsi1 = false;
  let removeGsi1 = false;
  let gsi1pk = "";
  let gsi1sk = "";

  if (to === "AVAILABLE" || to === "RESCUE_PENDING") {
    const gsi1 = unitQueueGsi1(to, current.component, current.expiresAt, unitId);
    gsi1pk = gsi1.GSI1PK;
    gsi1sk = gsi1.GSI1SK;
    setGsi1 = true;
  } else {
    removeGsi1 = true;
  }

  const setExpressions: string[] = [
    "#status = :toStatus",
    "#version = #version + :one",
  ];
  const removeExpressions: string[] = [];

  const exprNames: Record<string, string> = {
    "#status": "status",
    "#version": "version",
  };
  const exprValues: Record<string, any> = {
    ":fromStatus": from,
    ":toStatus": to,
    ":one": 1,
  };

  if (options?.claimedBy) {
    setExpressions.push("#claimedBy = :claimedBy", "#claimedAt = :claimedAt");
    exprNames["#claimedBy"] = "claimedBy";
    exprNames["#claimedAt"] = "claimedAt";
    exprValues[":claimedBy"] = options.claimedBy;
    exprValues[":claimedAt"] = now;
  }

  if (options?.activeEscalationId) {
    setExpressions.push("#activeEscalationId = :activeEscalationId");
    exprNames["#activeEscalationId"] = "activeEscalationId";
    exprValues[":activeEscalationId"] = options.activeEscalationId;
  }

  if (to === "RECEIVED") {
    setExpressions.push("#receivedAt = :receivedAt");
    exprNames["#receivedAt"] = "receivedAt";
    exprValues[":receivedAt"] = now;
  }

  if (to === "LOST") {
    setExpressions.push("#lostAt = :lostAt");
    exprNames["#lostAt"] = "lostAt";
    exprValues[":lostAt"] = now;
  }

  if (setGsi1) {
    setExpressions.push("#GSI1PK = :gsi1pk", "#GSI1SK = :gsi1sk");
    exprNames["#GSI1PK"] = "GSI1PK";
    exprNames["#GSI1SK"] = "GSI1SK";
    exprValues[":gsi1pk"] = gsi1pk;
    exprValues[":gsi1sk"] = gsi1sk;
  } else if (removeGsi1) {
    removeExpressions.push("GSI1PK", "GSI1SK");
  }

  let updateExpr = `SET ${setExpressions.join(", ")}`;
  if (removeExpressions.length > 0) {
    updateExpr += ` REMOVE ${removeExpressions.join(", ")}`;
  }

  const unitUpdateItem: TransactItem = {
    Update: {
      Key: keys,
      UpdateExpression: updateExpr,
      ConditionExpression: "#status = :fromStatus",
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
    },
  };

  const auditItem = buildAuditTransactItem({
    eventType,
    subjectType: "UNIT",
    subjectId: unitId,
    actorFacilityId: options?.actorFacilityId,
    timestamp: now,
    details: {
      fromStatus: from,
      toStatus: to,
      note: options?.note,
      ...(options?.details ?? {}),
    },
  });

  const transactItems: TransactItem[] = [unitUpdateItem, auditItem];

  if (to === "RECEIVED") {
    transactItems.push(
      buildStatsTransactItem(todayKey(), {
        unitsSaved: 1,
        valueSavedInr: current.valueInr ?? 1500,
      })
    );
  } else if (to === "LOST") {
    transactItems.push(
      buildStatsTransactItem(todayKey(), {
        unitsLost: 1,
        valueLostInr: current.valueInr ?? 1500,
      })
    );
  }

  await transact(transactItems);

  return {
    ...current,
    status: to,
    version: current.version + 1,
    claimedBy: options?.claimedBy ?? current.claimedBy,
    claimedAt: options?.claimedBy ? now : current.claimedAt,
    receivedAt: to === "RECEIVED" ? now : current.receivedAt,
    lostAt: to === "LOST" ? now : current.lostAt,
    activeEscalationId: options?.activeEscalationId ?? current.activeEscalationId,
  };
}
