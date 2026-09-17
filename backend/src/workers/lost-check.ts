import { isoNow, unitKey, type BloodUnit } from "@pulsechain/shared";
import { getItem } from "../lib/db.js";
import { transitionUnit } from "../lib/transitions.js";

export interface LostCheckInput {
  unitId: string;
}

export interface LostCheckOutput {
  unitId: string;
  status: string;
  transitioned: boolean;
  lostAt?: string;
}

export async function handler(event: LostCheckInput): Promise<LostCheckOutput> {
  const { unitId } = event;
  const unitKeys = unitKey(unitId);
  const unit = await getItem<BloodUnit>(unitKeys.PK, unitKeys.SK);

  if (!unit) {
    throw new Error(`Unit not found: ${unitId}`);
  }

  const now = isoNow();
  if ((unit.status === "AVAILABLE" || unit.status === "RESCUE_PENDING") && unit.expiresAt <= now) {
    const updated = await transitionUnit(unitId, unit.status, "LOST", {
      note: `Unit reached expiration date (${unit.expiresAt}) without being claimed`,
    });

    return {
      unitId,
      status: "LOST",
      transitioned: true,
      lostAt: updated.lostAt,
    };
  }

  return {
    unitId,
    status: unit.status,
    transitioned: false,
  };
}
